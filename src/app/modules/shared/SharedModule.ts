import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastErrorComponent } from './toast-error/toast-error.component';
import { LoadingComponent } from '../../components/loading/loading.component';


@NgModule({
	imports: [
			CommonModule,
			LoadingComponent,
			ToastErrorComponent
	],
	exports: [ToastErrorComponent]
})
export class SharedModule {
}
