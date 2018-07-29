import { FieldDef } from '..'

export default class Result {
  command: string;
  rowCount: number;
  oid: number;
  fields: FieldDef[];
  addRow(row: any): void;
  addFields(fields: FieldDef[]): void;
  addCommandComplete(msg: any): void;
  parseRow(data: any): any
}

