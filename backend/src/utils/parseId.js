function parsePositiveInt(value) {
  const id = Number(value);

  if (!Number.isInteger(id) || id <= 0) {
    return null;
  }

  return id;
}

module.exports = parsePositiveInt;
