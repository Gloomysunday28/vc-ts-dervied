import { Flow } from "@babel/types";
import type { IdentifierOptions } from './handleAst';

export interface GenerateTsAstMapsOption extends IdentifierOptions {
  optional?: boolean; // 是否是可选
  tsTypes?: Flow[]
}