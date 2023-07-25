import { type SnippetString, type Position} from 'vscode';

export interface BulletDto {
  content: SnippetString,
  position: Position
}
