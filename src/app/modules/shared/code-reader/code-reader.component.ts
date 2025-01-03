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

	private barcodeDetector: any;
	private lastDetectionTime: number = 0;
	public isScannerMode: boolean = true;
	public manualCode: string = '';

	ngOnInit(): void
	{
		if ('BarcodeDetector' in window)
		{

			//let formats = 'code_128,code_39,code_93,codabar,ean_13,ean_8,itf,pdf417,qr_code,upc_a'
			let formats = this.cam_code_type ? [this.cam_code_type] : undefined;
			this.barcodeDetector = new BarcodeDetector({ formats: formats });
			this.startCamera();
			this.isScannerMode = true;
		}
		else
		{
			this.isScannerMode = false;
		}
	}

	toggleMode(): void
	{
		this.isScannerMode = !this.isScannerMode;
		return this.isScannerMode ? this.startCamera() : this.stopCamera();
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
		const scanInterval = setInterval(() =>
		{
			console.log('camara iniciada');
			if (video.readyState === video.HAVE_ENOUGH_DATA && this.isScannerMode)
			{
				if (this.barcodeDetector)
				{
					this.barcodeDetector.detect(video)
					.then((barcodes: any) =>
					{
						const currentTime = Date.now();
						if (barcodes.length > 0 && (currentTime - this.lastDetectionTime > this.cam_debounce))
						{
							this.onDetect.emit(barcodes);
							this.lastDetectionTime = currentTime;
						}
					})
					.catch((err: any) =>
					{
							console.error('Error detectando códigos de barras:', err);
					});
				}
			}
		}, 100);
	}

	manualSubmit(): void
	{
		if (this.manualCode)
		{
			this.onDetect.emit([{ rawValue: this.manualCode }]);
			this.manualCode = '';
		}
	}
}
