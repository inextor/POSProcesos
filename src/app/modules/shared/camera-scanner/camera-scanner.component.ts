import { Component, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BaseComponent } from '../base/base.component';

@Component({
  selector: 'app-camera-scanner',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './camera-scanner.component.html',
  styleUrl: './camera-scanner.component.css'
})

export class CameraScannerComponent extends BaseComponent
{
	@ViewChild('canvas') canvas: ElementRef;

	current_constraints:MediaTrackConstraints = {};
	devices:MediaDeviceInfo[] = [];
	track:MediaStreamTrack | null = null;
	applied_constraints:any = null;
	needs_init:boolean = true;
	camera_id:string = '';
	processWhiteAndBlackImage:boolean = true;

	rect:any = null;
	otherProps:any = null;

	code:string = '';
	cameras_found:boolean = true;
	error_foo:string = '';
	img_string:string|null = null;
	original_cam_img:string|null = null;
	json_data:any = null;

	advanced_constraints:any = { advanced: [

	]};

	all_Tracks:any[] = [];

	video_constraints:any ={

	};

	ngOnInit(): void
	{
		navigator.mediaDevices.enumerateDevices().then((devices)=>
		{
			this.devices = devices

			let device = devices.find((d)=>{return d.label == 'camera2 0, facing back'});

			if( device )
			{
				this.camera_id = device.deviceId;
			}
		},(error)=>this.rest.showError(error));

		//(async () => {
		//	await this.worker.load();
		//	await this.worker.loadLanguage('eng');
		//	await this.worker.initialize('eng');
		//	await this.worker.setParameters({
		//		tessedit_char_whitelist: "Nn-0123456789",
		//		tessedit_pageseg_mode: PSM.SINGLE_LINE //'7' //	see /node_modules/tesseract.js/src/index.d.ts
		//	});
		//	//console.log(text);
		//	//this.error_foo = text;
		//	//this.onNewCodigo( text );
		//})()
	}

	@override
	ngOnDestroy()
	{
		this.stopVideo();
	}

	stopVideo()
	{
		let video = document.getElementById('video') as HTMLVideoElement;
		if( video )
		{
			video.pause();
		}

		if( this.track )
		{
			this.track.stop();
		}
	}

	imageCapture:any	= null;
	raw_photo_capabilities:any	= null;
	raw_video_capabilities:any	= null;
	video_options:Record<string,Capabilities> = {};

	onGetUserMediaButtonClick(evt:any)
	{
		this.stopVideo();
		this.initCam();
	}

	nextCam()
	{

	}

	onGrabFrameButtonClick(evt:any)
	{
		//this.imageCapture.grabFrame()
		//.then((imageBitmap:ImageBitmap) => {
		//	const canvas = document.querySelector('#grabFrameCanvas') as HTMLCanvasElement;
		//	this.drawCanvas(canvas, imageBitmap);
		//})
		//.catch(error => this.rest.showError(error));
	}

	onTakePhotoButtonClick(evt:any)
	{
		//this.imageCapture.takePhoto()
		//.then(blob => createImageBitmap(blob))
		//.then((imageBitmap:ImageBitmap) => {
		//	const canvas = document.getElementById('takePhotoCanvas') as HTMLCanvasElement;
		//	this.drawCanvas(canvas, imageBitmap);
		//})
		//.catch(error => this.rest.showError(error));
	}

	/* Utils */

	processGradientWhiteAndBlackNormalization(image_data:ImageData)
	{
		let val:number = 0;
		let sum:number = 0;
		let min:number = 255*3;
		let max:number	= 0;
		let i:number	=0;

		let width = image_data.width;
		let height = image_data.height;

		let mins:number[] = new Array(width);
		let maxs:number[]	= new Array(width);

		let index:number = 0;

		mins.fill(255*3);
		maxs.fill(0);

		for(let x=0;x<width;x++)
		{
			mins[x] = 255*3;
			maxs[x]	= 0;

			for(let y=0;y<height;y++)
			{
				index = y*(width*4)+x*4;
				sum = image_data.data[index]+image_data.data[index+1]+image_data.data[index+2];
				mins[ x ] = Math.min(mins[x],sum);
				maxs[ x ] = Math.max(maxs[x],sum);
				min = Math.min( min, sum );
				max = Math.max( max, sum );
			}
		}

		let row_delta:number = 0;
		let max_delta:number = 0;

		for(let x=0;x<width;x++)
		{
			row_delta = maxs[x]-mins[x];
			max_delta = max-mins[x];

			for(let y=0;y<height;y++)
			{
				index = y*(width*4)+x*4;
				sum = image_data.data[index]+image_data.data[index+1]+image_data.data[index+2];

				if( row_delta > 200 )
				{
					val = Math.round((sum-mins[x])/row_delta*255);
				}
				else
				{
					val = Math.round((sum-mins[x])/max_delta*255);
				}
				image_data.data[i] = val;
				image_data.data[i+1] = val;
				image_data.data[i+2] = val;
			}
		}
	}

	toWhiteAndBlack(image_data:ImageData)
	{
		let val:number = 0;
		let sum:number = 0;
		let min:number = 255*3;
		let max:number	= 0;
		let i:number	=0;

		for (i = 0; i < image_data.data.length; i += 4)
		{
			val = image_data.data[i]+image_data.data[i+1]+image_data.data[i+2];
			sum+= val;
			min = Math.min( min, val );
			max = Math.max( max, val );


				//imgData.data[i] = truncate(factor*(imgData.data[i]-128)+128);
				//imgData.data[i+1] = truncate(factor*(imgData.data[i+1]-128)+128);
				//imgData.data[i+2] = truncate(factor*(imgData.data[i+2]-128)+128);


		}

		let delta = max-min;

		let factor:number = 40;
		for (i = 0; i < image_data.data.length; i += 4)
		{
			sum = image_data.data[i]+image_data.data[i+1]+image_data.data[i+2];
			val = Math.round((sum-min)/delta*255); //Original = (sum-min)/delta*765/3 //Pero 765/3 =255
			val = this.truncate(factor*(val-128)+128);
			image_data.data[i] = val;
			image_data.data[i+1] = val;
			image_data.data[i+2] = val;

		}
	}
	truncate(val:number)
	{
		if( val < 0 )
			return 0;

		if( val > 255 )
			return 255;
		return Math.round(val);
	}

	drawCanvasVideo()
	{
		let video =	document.getElementById('video') as HTMLVideoElement;

		createImageBitmap(video).then((imageBitmap)=>{
			console.log('bitmap');
		//let image_ratio = document.getElementById('image_ratio');
			let video_container = document.getElementById('video_container');
			let image_ratio = document.getElementById('image_mask');
		//let rect = image_ratio.getBoundingClientRect();
		//this.rect = rect;
			let video_height = video.clientHeight;
			let video_width = video.clientWidth;

			let diff	= video_container.clientHeight-video.clientHeight;
			let rect	= image_ratio.getBoundingClientRect();
			let ratio	= imageBitmap.width/video_width;

			this.otherProps = {
				bitmap_widht:imageBitmap.width,
				bitmap_height: imageBitmap.height ,
				video_width,
				video_height,
				ratio,
				ystart: imageBitmap.height-(100*ratio)
			};

			let canvas	= document.createElement('canvas') as HTMLCanvasElement;
			canvas.width = rect.width;
			canvas.height = rect.height;

			let context = canvas.getContext('2d');
			context.drawImage
			(
				video,
				rect.x*ratio,
				(video_height-100-rect.height)*ratio,
				rect.width*ratio,
				rect.height*ratio,
				0,
				0,
				rect.width,
				rect.height
			);

			if( this.processWhiteAndBlackImage )
			{
				let image_data:ImageData = context.getImageData(0,0,rect.width,rect.height);
				//this.toWhiteAndBlack(image_data);
				this.processGradientWhiteAndBlackNormalization( image_data );
				context.putImageData(image_data, 0, 0);
			}

			this.img_string = canvas.toDataURL();
			this.scanOcr(this.img_string);

		},(error)=>this.rest.showError(error));

		//this.otherProps = { };

		//let pixels_size = window.devicePixelRatio;
		//this.otherProps['video_ClientHidth'] = video.clientWidth;
		//this.otherProps['video_ClientHeight'] = video.clientHeight;
		//this.otherProps['video_height'] = video.height;
		//this.otherProps['video_width'] = video.width;
		//this.otherProps['pixels_size'] = pixels_size;

		//let canvas	= document.createElement('canvas') as HTMLCanvasElement;
		//canvas.width = rect.width
		//canvas.height = rect.height
		//canvas.getContext('2d').drawImage(video, rect.x*pixels_size, rect.y*pixels_size , rect.width*pixels_size, rect.height*pixels_size, 0,0,rect.width,rect.height);

		//// convert it to a usable data URL
		//this.img_string = canvas.toDataURL();
	}

	drawCanvas(img:ImageBitmap)
	{
		let video =	document.getElementById('video') as HTMLVideoElement;

		createImageBitmap(video).then((imageBitmap)=>
		{

		});

		let image_ratio = document.getElementById('image_ratio');
		let rect = image_ratio.getBoundingClientRect();

		let canvas	= document.createElement('canvas') as HTMLCanvasElement;
		canvas.width = rect.width;
		canvas.height = rect.height;

		canvas.getContext('2d').drawImage(video, rect.x, rect.y, rect.width, rect.height, 0,0,rect.width,rect.height);

		// convert it to a usable data URL
		this.img_string = canvas.toDataURL();


		////let ratio	= Math.min(canvas.width / img.width, canvas.height / img.height);
		////let x = (canvas.width - img.width * ratio) / 2;
		////let y = (canvas.height - img.height * ratio) / 2;
		////canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
		////canvas.getContext('2d').drawImage(img, 0, 0, img.width, img.height, x, y, img.width * ratio, img.height * ratio);
		//canvas.getContext('2d').drawImage(img, 0, 0, canvas_width,canvas_height);
	}


	applyConstraints()
	{

		let constraints:any= { video:{ } };

		this.applied_constraints = constraints;

		if( this.needs_init )
		{
			this.initCam();
		}
		else
		{
			this.track.applyConstraints( constraints )
			.then(()=>
			{
				this.rest.showSuccess('Constraints applicados');
				this.updateConstraintsValues( this.track.getConstraints() )
			})
			.catch((error)=>
			{
				this.rest.showError(error);
			});
		}
	}

	updateConstraintsValues(mediaTrackConstraints:MediaTrackConstraints)
	{
		//this.current_constraints = mediaTrackConstraints;

		for(let i in mediaTrackConstraints)
		{
			let type = typeof( mediaTrackConstraints[i] );
			if( i in this.video_options && this.video_options[i].enable )
			{
				if( type == "string" || type == "number" || type == "boolean")
				{
					this.video_options.value = mediaTrackConstraints[i];
				}
			}
		}
	}

	updateVideoOption(video_option:Capabilities, evt:any)
	{
		console.log( evt.target.value );
		if( video_option.min !== undefined )
		{
			video_option.value = parseInt( evt.target.value );
			this.current_constraints[ video_option.name ] = video_option.value;
		}
		else
		{
			video_option.value = evt.target.value;
			this.current_constraints[ video_option.name ] = video_option.value;
		}


		if( this.needs_init )
		{
			this.applyConstraints()
		}
		else
		{
			let obj = {};
			obj[ video_option.name ] = video_option.value;

			this.track.applyConstraints({advanced:[ obj ]});
		}

	}

	initCam()
	{
		if( this.applied_constraints	== null )
		{
			//Este no
			this.applied_constraints =	{
				video:{
					facingMode:{ ideal: "environment" },
					focusDistance:{ ideal: 0.2 },
					//width: {ideal: 3840},
					//height: {ideal: 2160},
					width: {ideal: 2160},
					height: {ideal: 1620},
					zoom:{ideal: 4},
					resizeMode:{ ideal: "none" },
					focusMode:{ ideal: "continuous" }
				}
			};
		}

		if( this.camera_id )
		{
			this.applied_constraints = {
				video:{
					deviceId: this.camera_id,
					//width: {ideal: 2160},
					//height: {ideal: 800},
					//apectRatio:{ ideal:(4/3)},
					width: {ideal: 1620},
					height: {ideal: 2160},
					zoom: { ideal: 4 },
					focusDistance: { ideal: 0.1 },
					focusMode:{ ideal: "single-shot" }
				}
			};
		}
		else
		{
			this.applied_constraints.video['facingMode']={ ideal: 'environment' };
		}

		navigator.mediaDevices.getUserMedia( this.applied_constraints ).then( mediaStream =>
		{
			let video = document.getElementById('video') as HTMLVideoElement;
			video.srcObject = mediaStream;
			this.all_Tracks = mediaStream.getVideoTracks();
			this.track = this.all_Tracks[0];
			//this.imageCapture = getImageCapture( this.track );
			//this.raw_video_capabilities = this.track.getCapabilities();
			//this.updateConstraintsValues(this.track.getConstraints());
			return true;
			//'return this.imageCapture.getPhotoCapabilities();
		})
		.then((photoCapabilities)=>{
			this.raw_photo_capabilities = photoCapabilities;
		})
		.catch(error => this.rest.showError(error));
	}


	onCameraChange(evt:any)
	{
		this.camera_id = evt.target.value;
		this.stopVideo();
		setTimeout(()=>{
			this.initCam();
		},500);
	}

	changeNeedsInit(evt:any)
	{
		this.needs_init = evt.target.checked;
	}

	codigoLlego(codigo:string)
	{
		this.code = codigo;
		this.onNewCodigo(codigo);
	}

	onQrCodeArrived(code:string)
	{
		this.error_foo = code;
		let marbeteRegex=/^https:\/\/siat\.sat\.gob\.mx.*=N.\d+$/;

		if( marbeteRegex.test( code ) )
		{
			let codigo = code.replace(/.*=Nn(\d+)/,'$1');
			this.onNewCodigo(codigo);

		}
		else
		{
			this.error_foo = code;
		}
	}
}
