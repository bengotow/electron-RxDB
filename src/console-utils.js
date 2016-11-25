/* eslint import/prefer-default-export: 0 */
export function logSQLString(qa) {
  let q = qa.replace(/%/g, '%%');
  q = `color:black |||%c ${q}`;
  q = q.replace(/`(\w+)`/g, "||| color:purple |||%c$&||| color:black |||%c");

  const colorRules = {
    'color:green': ['SELECT', 'INSERT INTO', 'VALUES', 'WHERE', 'FROM', 'JOIN', 'ORDER BY', 'DESC', 'ASC', 'INNER', 'OUTER', 'LIMIT', 'OFFSET', 'IN'],
    'color:red; background-color:#ffdddd;': ['SCAN TABLE'],
  };

  for (const style of Object.keys(colorRules)) {
    for (const keyword of colorRules[style]) {
      q = q.replace(new RegExp(`\\b${keyword}\\b`, 'g'), `||| ${style} |||%c${keyword}||| color:black |||%c`);
    }
  }

  q = q.split('|||');
  const colors = [];
  const msg = [];
  for (let i = 0; i < q.length; i++) {
    if (i % 2 === 0) {
      colors.push(q[i]);
    } else {
      msg.push(q[i]);
    }
  }

  console.log(msg.join(''), ...colors);
}
