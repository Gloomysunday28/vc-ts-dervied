import * as t from "@babel/types";
import handleTsAst from "../handleTsAst";

export default {
  TryStatement(TryStatement: t.TryStatement[], returnBullet: t.ReturnStatement[]) {
    let returnStatement: t.Node[];

    if (TryStatement) {
      TryStatement.forEach((TryStatement) => {
        if (returnStatement = handleTsAst.ReturnStatement(TryStatement.block)) {
          returnBullet = returnBullet.concat(returnStatement as t.ReturnStatement[]);
        }
      })
    }

    return returnBullet;
  },
  SwitchStatement(SwitchStatement: t.SwitchStatement[], returnBullet: t.ReturnStatement[]) {
    SwitchStatement?.forEach(switchState => {
      const { cases } = switchState;
      if (Array.isArray(cases)) {
        cases.forEach((body) => {
          const returnStatement = body.consequent?.find(state => t.isReturnStatement(state));
          if (returnStatement) {
            returnBullet.push(returnStatement as t.ReturnStatement);
          }
        });
      }
    });

    return returnBullet;
  },
  IfStatement(
    IfStatement: t.IfStatement[],
    returnBullet: t.ReturnStatement[]
  ): t.ReturnStatement[] {
    let returnStatement: t.Node[];
    IfStatement.forEach((IfStatement) => {
      let { alternate, consequent } = IfStatement;
      let ifStatementBodyNoode = alternate;
      while (((alternate = (alternate as any)?.alternate), alternate)) {
        ifStatementBodyNoode = alternate;
      }
      if (
        ifStatementBodyNoode &&
        (returnStatement = handleTsAst.ReturnStatement((ifStatementBodyNoode as t.FunctionDeclaration['body'])))
      ) {
        returnBullet = returnBullet.concat(
          returnStatement as t.ReturnStatement[]
        );
      }

      ifStatementBodyNoode = consequent;
      while (((consequent = (consequent as any)?.consequent), consequent)) {
        ifStatementBodyNoode = consequent;
      }
      if (
        ifStatementBodyNoode &&
        (returnStatement = handleTsAst.ReturnStatement((ifStatementBodyNoode as t.FunctionDeclaration['body'])))
      ) {
        returnBullet = returnBullet.concat(
          returnStatement as t.ReturnStatement[]
        );
      }
    });

    return returnBullet;
  },
};
