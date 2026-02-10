import { TransformationInfo } from '../Models';
import { transformation } from './Transformation';

export function transformation_info(): TransformationInfo {
	return {
		transformation: transformation(),
		provider_user: null,
		inputs: [],
		outputs: []
	};
}
