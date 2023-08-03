import { type Position, type MarkdownString } from 'vscode';

export interface BulletDto {
  content: string,
  position: Position,
  async: boolean,
  type: string,
  name: string,
  hoverMessage?: MarkdownString;
}
