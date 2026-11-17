class Utility {
  static capitalizeWords(string) {
    if (typeof string !== 'string' || string.length === 0) {
        return string;
    }
    return string
        .toLowerCase()
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
  }

  static selectFromList(value, list = [], defaultValue = '') {
    for (var i=0; i<list.length - 1; i++) {
      if (value.toLowerCase() === list[i].toLowerCase()) {
        return value;
      }
    }

    return defaultValue;
  }
}

module.exports = Utility;
