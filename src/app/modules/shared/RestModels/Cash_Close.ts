export interface Cash_Close{
	cash_on_hand:number;
	created:Date;
	created_by_user_id:number
	end:string;	// 'Hora de la dispositivo del cajero, No es una hora fiable, para hacer las cuentas solo sirve para imprimir el ticket',
	id:number;
	since:Date;
	start:string;	// 'Hora de la dispositivo del cajero, No es una hora fiable, para hacer las cuentas solo sirve para imprimir',
	updated:Date;
}
