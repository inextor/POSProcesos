import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
	name: 'dateCountdown',
	standalone: true
})
export class DateCountdownPipe implements PipeTransform
{
	transform(value: unknown, ...args: unknown[]): unknown
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
}
