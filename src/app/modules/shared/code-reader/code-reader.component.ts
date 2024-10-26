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
export class CodeReaderComponent implements OnInit {
  @Input() cam_debounce: number = 300;
  @Input() cam_code_type: string | undefined;  
  @Output() onDetect: EventEmitter<any> = new EventEmitter();

  private barcodeDetector: any;
  private lastDetectionTime: number = 0;
  public isScannerMode: boolean = true;
  public manualCode: string = '';

  ngOnInit(): void {
    if ('BarcodeDetector' in window) {
      this.barcodeDetector = new BarcodeDetector({
        formats: this.cam_code_type ? [this.cam_code_type] : ['qr_code', 'ean_13', 'code_128']
      });
      this.startCamera();
    } else {
      console.error('BarcodeDetector no está soportado en este navegador.');
    }
  }

  toggleMode(): void {
    this.isScannerMode = !this.isScannerMode;
    if (this.isScannerMode) {
      this.startCamera();
    } else {
      this.stopCamera();
    }
  }

  startCamera(): void {
    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
      .then((stream) => {
        const video = document.querySelector('video') as HTMLVideoElement;
        video.srcObject = stream;
        video.play();

        video.addEventListener('play', () => {
          this.scanBarcode(video);
        });
      })
      .catch((err) => {
        console.error('Error al acceder a la cámara: ', err);
      });
  }

  stopCamera(): void {
    const video = document.querySelector('video') as HTMLVideoElement;
    const stream = video.srcObject as MediaStream;
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
  }

  scanBarcode(video: HTMLVideoElement): void {
    const scanInterval = setInterval(() => {
      if (video.readyState === video.HAVE_ENOUGH_DATA && this.isScannerMode) {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(video, 0, 0, canvas.width, canvas.height);

        if (this.barcodeDetector) {
          this.barcodeDetector.detect(canvas)
            .then((barcodes: any) => {
              const currentTime = Date.now();
              if (barcodes.length > 0 && (currentTime - this.lastDetectionTime > this.cam_debounce)) {
                this.onDetect.emit(barcodes);
                this.lastDetectionTime = currentTime;
              }
            })
            .catch((err: any) => {
              console.error('Error detectando códigos de barras:', err);
            });
        }
      }
    }, 100);
  }

  manualSubmit(): void {
    if (this.manualCode) {
      this.onDetect.emit([{ rawValue: this.manualCode }]);
      this.manualCode = '';
    }
  }
}