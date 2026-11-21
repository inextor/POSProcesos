import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AnswerInfo } from '../../modules/shared/Models';
import { FormOptions } from '../../classes/FormOptions';
import { Form, Response } from '../../modules/shared/RestModels';
import { ShortDatePipe } from '../../modules/shared/pipes/short-date.pipe';

interface CAnswerInfo extends AnswerInfo
{
	answer_display: string;
}

@Component({
	selector: 'app-form-response-viewer',
	standalone: true,
	imports: [CommonModule, ShortDatePipe],
	templateUrl: './form-response-viewer.component.html',
	styleUrl: './form-response-viewer.component.css'
})
export class FormResponseViewerComponent implements OnChanges
{
	@Input() response: Response | null | undefined = null;
	@Input() form: Form | null | undefined = null;
	@Input() answers: AnswerInfo[] | undefined = [];
	sorted_answer_array: CAnswerInfo[] = [];

	ngOnChanges(_changes: SimpleChanges): void
	{
		this.sorted_answer_array = (this.answers || [])
			.slice()
			.sort((a, b) => b.question.priority - a.question.priority)
			.map(ai => ({
				...ai,
				answer_display: this.computeAnswerValue(ai)
			}));
	}

	computeAnswerValue(ai: AnswerInfo): string
	{
		if (FormOptions.isLabel(ai.question))
			return '';

		if (FormOptions.isCheckbox(ai.question))
		{
			let joined = FormOptions.parseCheckboxAnswer(ai.answer?.answer_text).join(', ');

			if (joined)
				return joined;
		}
		else if (ai.answer?.answer_text)
		{
			return ai.answer.answer_text;
		}

		if (ai.answer?.answer_number != null && ai.answer.answer_number !== 0)
			return String(ai.answer.answer_number);

		return '—';
	}
}
