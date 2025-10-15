export interface Attachment{
	content_type:string;
	created:Date;
	file_type_id:number | null;
	filename:string | null;
	height:number | null;
	id:number;
	original_filename:string;
	size:number;
	status:'ACTIVE'|'DELETED';
	updated:Date;
	uploader_user_id:number | null;
	width:number | null;
}
