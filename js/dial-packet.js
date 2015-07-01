(function(exports) {
  const READ_TIMEOUT = 10000;
  const BITS_IN_BYTE = 8;

  const priv = {
    buffer: Symbol('buffer'),
    readStartTime: Symbol('readStartTime'),
    readTimeout: Symbol('readTimeout')
  };

  function decimalToBitArray(decimal) {
    var binaryString = (decimal >>> 0).toString(2);

    if (binaryString.length < BITS_IN_BYTE) {
      binaryString = '0'.repeat(BITS_IN_BYTE - binaryString.length) +
        binaryString;
    }

    return Array.from(binaryString).map((digit) => +digit);
  }

  var DialPacket = function(buffer) {
    this[priv.buffer] = buffer || [];
  };

  /**
   * Converts string to DialPacket.
   * @param {string} stringToSerialize String to convert to.
   * @returns {DialPacket}
   */
  DialPacket.fromString = function(stringToSerialize) {
    if (stringToSerialize.length > 255) {
      throw new Error('String is too long. Max length is 255 characters.');
    }

    var buffer = decimalToBitArray(stringToSerialize.length);

    var charCode;
    for (var i = 0; i < stringToSerialize.length; i++) {
      charCode = stringToSerialize.charCodeAt(i);

      if (charCode > 255) {
        throw new Error('ASCII symbols are only allowed!');
      }

      buffer.push(...decimalToBitArray(charCode));
    }

    return new DialPacket(buffer);
  };

  DialPacket.prototype = {
    startReading() {
      if (this.isCompleted()) {
        throw new Error('DialPacket is ready and frozen!');
      }

      this[priv.readStartTime] = Date.now();

      return new Promise((resolve) => {
        this[priv.readTimeout] = setTimeout(() => {
          console.log('Read duration is %s', READ_TIMEOUT);

          this.pushToBuffer([1, 1]);
          this[priv.readTimeout] = null;
          resolve();
        }, READ_TIMEOUT);
      });
    },

    stopReading() {
      if (!this[priv.readTimeout]) {
        return;
      }

      if (this.isCompleted()) {
        throw new Error('DialPacket is ready and frozen!');
      }

      clearTimeout(this[priv.readTimeout]);
      this[priv.readTimeout] = null;

      var readDuration = Date.now() - this[priv.readStartTime];

      console.log('Read duration is %s', readDuration);

      if (readDuration < 3100) {
        this.pushToBuffer([0, 0]);
      } else if (readDuration < 6100) {
        this.pushToBuffer([0, 1]);
      } else if (readDuration < 9100) {
        this.pushToBuffer([1, 0]);
      } else {
        this.pushToBuffer([1, 1]);
      }
    },

    /**
     * Indicates whether data packet is successfully read.
     * @returns {boolean}
     */
    isCompleted() {
      var buffer = this[priv.buffer];

      // "1" byte for the length
      return buffer.length >= BITS_IN_BYTE &&
        buffer.length % BITS_IN_BYTE === 0 &&
        this.getLength() === buffer.length / BITS_IN_BYTE - 1;
    },

    /**
     * Returns size of message in data packet.
     * @returns {number}
     */
    getLength() {
      var buffer = this[priv.buffer];

      if (buffer.length < BITS_IN_BYTE) {
        throw new Error('Length is not known yet!');
      }

      return parseInt(buffer.slice(0, BITS_IN_BYTE).join(''), 2);
    },

    /**
     * Pushes bits to the buffer.
     * @param {Array.<number>} bits Bits to add to the buffer.
     */
    pushToBuffer(bits) {
      var buffer = this[priv.buffer];
      buffer.push(...bits);

      var isLengthBits = buffer.length <= BITS_IN_BYTE;

      var bitsLeft = isLengthBits ?
        'unknown' :
        this.getLength() * BITS_IN_BYTE + BITS_IN_BYTE - buffer.length;

      console.log(
        'Pushed to buffer: %s (length: %s, left: %s)',
        bits.join(', '),
        isLengthBits,
        bitsLeft
      );
    },

    toBinary() {
      if (!this.isCompleted()) {
        throw new Error('Content is not ready yet!');
      }

      var buffer = this[priv.buffer];
      var contentLength = this.getLength();
      var bytes = [];
      var index = 0;

      while (index < contentLength) {
        bytes.push(
          buffer.slice(
            index * BITS_IN_BYTE + BITS_IN_BYTE,
            index * BITS_IN_BYTE + BITS_IN_BYTE + BITS_IN_BYTE
          )
        );
        index++;
      }

      return bytes;
    },

    toDecimal() {
      return this.toBinary().map((bits) => parseInt(bits.join(''), 2));
    },

    toString() {
      return String.fromCharCode(...this.toDecimal());
    },

    raw: function* () {
      for (var bit of this[priv.buffer]) {
        yield bit;
      }
    }
  };

  exports.DialPacket = DialPacket;
})(window);