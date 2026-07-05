import { encodingForModel, TiktokenModel } from 'js-tiktoken';
import { TokenizerTester } from '../base';

export class SystemPromptTester extends TokenizerTester {
  encode(modelName: TiktokenModel) {
    const encoder = encodingForModel(modelName)
    const tokens = encoder.encode("")

    console.log(`Input tokens for ${modelName} are:  ${tokens.length}`);
  }
}