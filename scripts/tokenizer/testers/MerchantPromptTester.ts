import { encodingForModel, TiktokenModel } from 'js-tiktoken';
import { MERCHANT_CATEGORIZATION_RULES as MerchantPrompt } from '@money-up/common';
import { TokenizerTester } from '../base';

export class MerchantPromptTester extends TokenizerTester {
  encode(modelName: TiktokenModel) {
    const encoder = encodingForModel(modelName);
    const tokens = encoder.encode(MerchantPrompt);

    console.log(`Input tokens for ${modelName} are:  ${tokens.length}`);
  }
}
