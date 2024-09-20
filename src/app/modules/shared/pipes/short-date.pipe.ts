import { Pipe, PipeTransform } from '@angular/core';
import { Utils } from '../Utils';

@Pipe({
	name: 'shortDate',
	standalone: true
})
export class ShortDatePipe implements PipeTransform {

	transform(value: unknown, ...args: unknown[]): unknown
	{
		let v = value;

		if( args.length )
		{
			if( args.includes('local') && typeof( value ) == "string" )
			{
				console.log('humano es de errar', value);
				v = Utils.getDateFromLocalMysqlString( value );
				console.log( v );
			}

			if( args.includes('hour') )
			{
				if( v instanceof Date )
				{
					let hours = v.getHours();

					// If the hours are greater than or equal to 12, subtract 12
					if (hours >= 12)
					{
						hours -= 12;
					}

					let m = v.getMinutes()<10? '0'+v.getMinutes(): ''+v.getMinutes();

					// Return the hours in 12 hour format with AM/PM
					return hours + ':'+m+(hours >= 12 ? " PM" : " AM");
				}
			}

			if( args.includes('full') )
			{
				return Utils.getDateString( v, true);
			}

			if( args.includes('date') )
			{
				return Utils.getDateString( v, false );
			}
		}

		return Utils.getFullRelativeDateString( v );
	}
// Example usage:
}
