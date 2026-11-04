import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Attachment, File_Type } from '../../modules/shared/RestModels';
import { RestService } from '../../modules/shared/services/rest.service';

export interface AttachmentGalleryItem
{
	attachment: Attachment | null;
	file_type?: File_Type | null;
	title?: string | null;
}

interface CAttachmentGalleryItem extends AttachmentGalleryItem
{
	is_image: boolean;
	display_title: string;
	file_url: string;
	download_url: string;
}

@Component({
	selector: 'app-attachment-gallery',
	standalone: true,
	imports: [CommonModule],
	templateUrl: './attachment-gallery.component.html',
	styleUrl: './attachment-gallery.component.css'
})
export class AttachmentGalleryComponent implements OnChanges
{
	@Input() items: AttachmentGalleryItem[] = [];
	gallery_item_array: CAttachmentGalleryItem[] = [];

	constructor(public rest: RestService)
	{
	}

	ngOnChanges(_changes: SimpleChanges): void
	{
		this.gallery_item_array = (this.items || []).map(item => this.getCItem(item));
	}

	getCItem(item: AttachmentGalleryItem): CAttachmentGalleryItem
	{
		let is_image = item.file_type
			? item.file_type.is_image == 'YES'
			: (item.attachment?.content_type || '').toLowerCase().startsWith('image/');
		let display_title = item.title || item.attachment?.original_filename || item.attachment?.filename || 'Archivo';
		let attachment_id = item.attachment?.id || 0;
		return {
			...item,
			is_image,
			display_title,
			file_url: this.rest.getFilePath(attachment_id),
			download_url: this.rest.getFilePath(attachment_id, true)
		};
	}
}
