import { Component } from '@angular/core';
import { BaseComponent } from '../../modules/shared/base/base.component';
import { Transformation } from '../../modules/shared/RestModels';
import { TransformationInfo } from '../../modules/shared/Models';
import { GetEmpty } from '../../modules/shared/GetEmpty';
import { ExcelUtils } from '../../modules/shared/Finger/ExcelUtils';
import { Rest } from '../../modules/shared/services/Rest';

@Component({
  selector: 'app-transform-batch-items',
  imports: [],
  templateUrl: './transform-batch-items.component.html',
  styleUrl: './transform-batch-items.component.css'
})
export class TransformBatchItemsComponent extends BaseComponent {
  transformations_file: File | null = null;

  rest_transformation_info: Rest<Transformation, TransformationInfo> = this.rest.initRest('transformation_info', ['name', 'id', 'created', 'updated', 'status', 'provider_user_id', 'reference', 'note']);

  ngOnInit(): void {

  }

  onFileChanged(event: Event): void {
    let target = event.target as HTMLInputElement;

    if (target.files && target.files.length) {
      this.transformations_file = target.files[0];
    } else {
      this.transformations_file = null;
    }
  }

  downloadTemplate(): void {
    let headers = `transformation_name,reference,input_item_id,input_quantity,output_item_id,output_quantity`
      .split(',')
      .map(i => i.trim());

    ExcelUtils.downloadTemplate('plantilla_transformaciones.xlsx', headers);
  }

  createTransformations(event: Event): void {
    event.preventDefault();

    if (!this.transformations_file) {
      this.showError('Debe seleccionar un archivo');
      return;
    }

    let headers = `transformation_name,reference,input_item_id,input_quantity,output_item_id,output_quantity`
      .split(',')
      .map(i => i.trim());

    this.is_loading = true;

    ExcelUtils.xlsx2json(this.transformations_file, headers)
      .then((response) => {
        console.log('response', response);

        // Group rows by transformation_name + reference
        let transformation_groups = new Map<string, any[]>();

        response.forEach((row: any) => {
          if (!row.transformation_name || !row.input_item_id || !row.output_item_id) {
            console.warn('Skipping row - missing required fields:', row);
            return;
          }

          let key = `${row.transformation_name}|${row.reference || ''}`;

          if (!transformation_groups.has(key)) {
            transformation_groups.set(key, []);
          }

          transformation_groups.get(key)!.push({
            input_item_id: parseInt(row.input_item_id),
            input_quantity: parseFloat(row.input_quantity) || 1,
            output_item_id: parseInt(row.output_item_id),
            output_quantity: parseFloat(row.output_quantity) || 1
          });
        });

        console.log('Transformation groups:', transformation_groups);

        if (transformation_groups.size === 0) {
          this.showError('No se encontraron datos válidos en el archivo');
          this.is_loading = false;
          return;
        }

        // Build payloads for each transformation
        let payloads: any[] = [];

        transformation_groups.forEach((rows, key) => {
          let [name, reference] = key.split('|');
          let transformation = GetEmpty.transformation();
          transformation.name = name.trim();
          transformation.reference = reference.trim() || null;
          transformation.status = 'ACTIVE';

          let inputs = rows.map(row => ({
            item_id: row.input_item_id,
            quantity: row.input_quantity
          }));

          let outputs = rows.map(row => ({
            item_id: row.output_item_id,
            quantity: row.output_quantity
          }));

          payloads.push({
            transformation: transformation,
            inputs: inputs,
            outputs: outputs
          });
        });

        console.log('Payloads to create:', payloads);

        // Create all transformations in a single request
        this.subs.sink = this.rest_transformation_info.create(payloads).subscribe({
          next: (results: any) => {
            let count = Array.isArray(results) ? results.length : 1;
            this.showSuccess(`${count} transformaciones creadas correctamente`);
            console.log('Created transformations:', results);
            this.is_loading = false;
            // Reset file input
            this.transformations_file = null;
            let file_input = document.querySelector('input[type="file"]') as HTMLInputElement;
            if (file_input) {
              file_input.value = '';
            }
          },
          error: (error) => {
            this.showError("Error al crear transformaciones: " + error);
            this.is_loading = false;
          }
        });
      })
      .catch((error) => {
        this.showError("Error al leer el archivo: " + error);
        this.is_loading = false;
      });
  }
}