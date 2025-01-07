import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
declare var BarcodeDetector: any;

@Component({
	selector: 'app-code-reader',
	standalone: true,
	imports: [CommonModule, FormsModule],
	templateUrl: './code-reader.component.html',
	styleUrl: './code-reader.component.css'
})
export class CodeReaderComponent implements OnInit
{
	@Input() cam_debounce: number = 300;
	@Input() cam_code_type: string | undefined;
	@Output() onDetect: EventEmitter<any> = new EventEmitter();

	private barcode_detector: any = null;
	private last_detection_time: number = 0;
	public is_scanner_mode: boolean = true;
	public manual_code: string = '';
	check_scan_interval: number = 0;
	is_scanning: boolean = false;

	ngOnInit(): void
	{
		if ('BarcodeDetector' in window)
		{
			//let formats = 'code_128,code_39,code_93,codabar,ean_13,ean_8,itf,pdf417,qr_code,upc_a'
			let formats = this.cam_code_type ? [this.cam_code_type] : undefined;
			this.barcode_detector = new BarcodeDetector({ formats: formats });
			this.startCamera();
			this.is_scanner_mode = true;
		}
		else
		{
			this.is_scanner_mode = false;
		}
	}

	toggleMode(): void
	{
		this.is_scanner_mode = !this.is_scanner_mode;
		return this.is_scanner_mode ? this.startCamera() : this.stopCamera();
	}

	startCamera(): void
	{
		navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
		.then((stream) =>
		{
			const video = document.querySelector('video') as HTMLVideoElement;
			video.srcObject = stream;
			video.play();

			video.addEventListener('play', ()=> this.scanBarcode(video));
		})
		.catch((err) =>
		{
			//this.showError('Error al acceder a la cámara');
		});
	}

	stopCamera(): void
	{
		const video = document.querySelector('video') as HTMLVideoElement;
		const stream = video.srcObject as MediaStream;
		if (stream)
		{
			stream.getTracks().forEach(track => track.stop());
		}
	}

	scanBarcode(video: HTMLVideoElement): void
	{
		if( this.check_scan_interval )
		{
			clearInterval(this.check_scan_interval);
		}

		//El editor marca error pero no hay error en el compilador
		this.check_scan_interval = setInterval(() =>
		{
			let is_blocked = this.is_scanning ||
				!this.is_scanner_mode ||
				!this.barcode_detector ||
				video.readyState !== video.HAVE_ENOUGH_DATA

			if( is_blocked )
			{
				return;
			}

			this.is_scanning = true;

			this.barcode_detector.detect( video )
			.then((barcodes: any) =>
			{
				const current_time = Date.now();
				if (barcodes.length > 0 && (current_time - this.last_detection_time > this.cam_debounce))
				{
					this.onDetect.emit(barcodes);
					this.last_detection_time = current_time;
				}

				this.is_scanning = false;
			})
			.catch((err: any) =>
			{
				console.error('Error detectando códigos de barras:', err);
				this.is_scanning = false;
			});
		}, 300);
	}

	manualSubmit(): void
	{
		if (this.manual_code)
		{
			this.onDetect.emit([{ rawValue: this.manual_code }]);
			this.manual_code = '';
		}
	}
}
