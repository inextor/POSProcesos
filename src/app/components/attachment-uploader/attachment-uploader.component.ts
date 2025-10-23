import { Component, OnInit, Input, Output, EventEmitter, OnChanges, SimpleChanges, Injector } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BaseComponent } from '../../modules/shared/base/base.component';
import { Preferences, File_Type } from '../../modules/shared/RestModels';
import { AttachmentInfo } from '../../modules/shared/Models';
import { SubSink } from 'subsink';
import { from } from 'rxjs';
import { concatMap } from 'rxjs/operators';

@Component({
	selector: 'app-attachment-uploader',
	standalone: true,
	imports: [CommonModule],
	templateUrl: './attachment-uploader.component.html',
	styleUrls: ['./attachment-uploader.component.css']
})
export class AttachmentUploaderComponent extends BaseComponent implements OnInit, OnChanges {

	@Input() attachment_id?: number;
	@Input() image?: number;
	@Input() default_message: string = 'Add File Attachment';
	@Output() attachmentChange = new EventEmitter<AttachmentInfo>();
	@Output() attachment_idChange = new EventEmitter<number>();
	@Input() displayUploadedAttachmentName: boolean = true;
	@Input() containerClasses: any = { 'avatar': true, 'avatar-sm': true };
	@Input() imageClasses: any = { 'avatar-img': true };
	@Input() multiple: boolean = false;

	file_type?: File_Type;
	filename?: string;
	file_id = '_attachment_uploader_' + Date.now();

	preferences?: Preferences;

	constructor(injector: Injector) {
		super(injector);
	}

	ngOnInit(): void {
		this.preferences = this.rest.preferences;
	}

	uploadAttachment(evt: any) {
		console.log('Subiendo archivo', evt.target.files);
		if (evt.target.files.length == 0) {
			console.error('No se subio nada el archivo');
			return;
		}

		let files: File[] = this.multiple ? Array.from(evt.target.files) : [evt.target.files[0]];

		this.subs.sink = from(files).pipe(
			concatMap((file: File) => {
				return this.rest.uploadAttachment(file, false);
			})
		)
		.subscribe({
			next: (attachmentInfo) => {
				this.file_type = attachmentInfo.file_type;
				this.filename = attachmentInfo.attachment.original_filename;
				this.attachment_id = attachmentInfo.attachment.id;

				this.attachmentChange.emit(attachmentInfo);
				this.attachment_idChange.emit(attachmentInfo.attachment.id);
			},
			error: (error) => {
				this.rest.showError(error);
			}
		});
	}

	ngOnChanges(props: SimpleChanges) {
		// Handle changes if needed
	}
}
