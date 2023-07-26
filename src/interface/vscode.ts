import { type Position, type MarkdownString } from 'vscode';

export interface BulletDto {
  content: string,
  position: Position,
  type: string,
  name: string,
  hoverMessage?: MarkdownString;
}
