import { Pipe, PipeTransform } from '@angular/core';
import { Utils } from '../Utils';

@Pipe({
	name: 'shortDate',
	standalone: true
})
export class ShortDatePipe implements PipeTransform {

	transform(value: unknown, ...args: unknown[]): unknown
	{
		if( args.length )
		{
			if( args[0] == 'hour' )
			{
				if( value instanceof Date )
				{
					let hours = value.getHours();

					// If the hours are greater than or equal to 12, subtract 12
					if (hours >= 12)
					{
						hours -= 12;
					}

					let m = value.getMinutes()<10? '0'+value.getMinutes(): ''+value.getMinutes();

					// Return the hours in 12 hour format with AM/PM
					return hours + ':'+m+(hours >= 12 ? " PM" : " AM");
				}
			}

			if( args[0] == 'full' )
			{
				return Utils.getDateString( value, true);
			}

			if( args[0] == 'date' )
			{
				return Utils.getDateString( value, false );
			}
		}

		return Utils.getFullRelativeDateString( value );
	}
// Example usage:
}
