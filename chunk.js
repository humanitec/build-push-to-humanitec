module.exports = {
  args: (str) => {
    const args = [];
    str = str.trim();
    let currentArg = '';
    for (let i = 0; i < str.length; i++) {
      switch (str[i]) {
        case '\'':
          const endQuoteIndex = str.indexOf('\'', i+1);
          if (endQuoteIndex < 0) {
            throw 'single quote not closed';
          }
          currentArg = currentArg + str.substring(i+1, endQuoteIndex);
          i = endQuoteIndex;
          break;
        case '"':
          // Double quotes can contain escaped characters
          for (i++; i < str.length && str[i] !== '"'; i++) {
            if (str[i] === '\\' && (i+1) < str.length) {
              i++;
              switch (str[i]) {
                case 'n':
                  currentArg += '\n';
                  break;
                case 'r':
                  currentArg += '\r';
                  break;
                case 't':
                  currentArg += '\t';
                  break;
                default:
                  currentArg += str[i];
              }
            } else {
              currentArg += str[i];
            }
          }
          if (i >= str.length) {
            throw 'double quote not closed';
          }
          break;
        case ' ':
        case '\t':
          args.push(currentArg);
          currentArg = '';
          while (i < str.length && (str[i] === ' ' || str[i] === '\t')) {
            i++;
          }
          // We will have advanced to the next non-whitespace
          i--;
          break;
        case '\\':
          i++;
          if (i < str.length) {
            currnetArg = currentArg + str[i];
          } else {
            throw 'uncompleted escape character';
          }
          break;
        default:
          currentArg = currentArg + str[i];
          break;
      }
    }
    if (currentArg != '') {
      args.push(currentArg);
    }
    return args;
  },
};
