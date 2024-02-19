import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastErrorComponent } from './toast-error/ToastErrorComponent';


@NgModule({
    imports: [
        CommonModule,
        ToastErrorComponent
    ],
    exports: [ToastErrorComponent]
})
export class SharedModule {
}
