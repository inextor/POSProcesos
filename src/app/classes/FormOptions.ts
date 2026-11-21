import { Question } from '../modules/shared/RestModels';

export class FormOptions
{
	static OPTION_TYPES = ['select', 'checkbox'];

	static isOptionType(question: Question | null | undefined): boolean
	{
		return !!question && FormOptions.OPTION_TYPES.indexOf(question.type) >= 0;
	}

	static isCheckbox(question: Question | null | undefined): boolean
	{
		return !!question && question.type == 'checkbox';
	}

	static isLabel(question: Question | null | undefined): boolean
	{
		return !!question && question.type == 'label';
	}

	static parseOptions(question: Question | null | undefined): string[]
	{
		let raw = question?.options;

		if (!raw)
			return [];

		try
		{
			let parsed = JSON.parse(raw);

			if (Array.isArray(parsed))
				return parsed.map((o) => String(o)).filter((o) => o !== '');
		}
		catch (e)
		{
			return raw.split(/\r?\n|,/).map((o) => o.trim()).filter((o) => o !== '');
		}

		return [];
	}

	static serializeOptions(options: string[]): string | null
	{
		let clean = (options || []).map((o) => String(o).trim()).filter((o) => o !== '');
		return clean.length ? JSON.stringify(clean) : null;
	}

	static parseCheckboxAnswer(answer_text: string | null | undefined): string[]
	{
		if (answer_text == null || !String(answer_text).trim())
			return [];

		try
		{
			let parsed = JSON.parse(answer_text);

			if (Array.isArray(parsed))
				return parsed.map((o) => String(o));
		}
		catch (e)
		{
		}

		return [String(answer_text)];
	}

	static encodeCheckboxAnswer(selected: string[]): string
	{
		return selected && selected.length ? JSON.stringify(selected) : '';
	}

	static formatAnswer(question: Question, answer_text: string | null | undefined): string
	{
		if (FormOptions.isCheckbox(question))
			return FormOptions.parseCheckboxAnswer(answer_text).join(', ');

		return answer_text != null ? String(answer_text) : '';
	}

	static isAnswered(question: Question, answer_text: string | null | undefined): boolean
	{
		if (FormOptions.isLabel(question))
			return true;

		if (FormOptions.isCheckbox(question))
			return FormOptions.parseCheckboxAnswer(answer_text).length > 0;

		return !!(answer_text != null && String(answer_text).trim());
	}
}
