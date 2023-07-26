import { Flow } from "@babel/types";

export interface GenerateTsAstMapsOption {
  optional?: boolean; // 是否是可选
  tsTypes?: Flow[]
}