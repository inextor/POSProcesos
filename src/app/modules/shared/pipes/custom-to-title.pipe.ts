import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'customToTitle',
  standalone: true
})
export class CustomToTitlePipe implements PipeTransform {

  transform(value: unknown, ...args: unknown[]): unknown {
	if( args.length )
	{
		if ( args[0] == 'snake_case' && typeof value === 'string')
		{
			return value.toString().replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
		}
	}
	return value;
  }

}
