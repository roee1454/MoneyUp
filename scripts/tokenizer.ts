import { encodingForModel, type TiktokenModel } from "js-tiktoken";
import { MERCHANT_CATEGORIZATION_RULES as MerchantPrompt } from "@money-up/common";

function EncodeMerchantPrompt(modelName: TiktokenModel) {
  const encoder = encodingForModel(modelName)
  const tokens = encoder.encode(MerchantPrompt)

  console.log(`Input tokens for ${modelName} are:  ${tokens.length}`)
}

function main() {
  EncodeMerchantPrompt("gpt-5-mini")
}

main();