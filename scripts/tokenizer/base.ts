import { type TiktokenModel } from 'js-tiktoken';

export abstract class TokenizerTester {
  abstract encode(modelName: TiktokenModel): void;
}