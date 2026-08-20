/* ===== Inlined QR generator (qrcode-generator by Kazuhiko Arase, MIT) — inlined so the UPI QR never depends on an external file ===== */
//---------------------------------------------------------------------
//
// QR Code Generator for JavaScript
//
// Copyright (c) 2009 Kazuhiko Arase
//
// URL: http://www.d-project.com/
//
// Licensed under the MIT license:
//  http://www.opensource.org/licenses/mit-license.php
//
// The word 'QR Code' is registered trademark of
// DENSO WAVE INCORPORATED
//  http://www.denso-wave.com/qrcode/faqpatent-e.html
//
//---------------------------------------------------------------------

var qrcode = function() {

  //---------------------------------------------------------------------
  // qrcode
  //---------------------------------------------------------------------

  /**
   * qrcode
   * @param typeNumber 1 to 40
   * @param errorCorrectionLevel 'L','M','Q','H'
   */
  var qrcode = function(typeNumber, errorCorrectionLevel) {

    var PAD0 = 0xEC;
    var PAD1 = 0x11;

    var _typeNumber = typeNumber;
    var _errorCorrectionLevel = QRErrorCorrectionLevel[errorCorrectionLevel];
    var _modules = null;
    var _moduleCount = 0;
    var _dataCache = null;
    var _dataList = [];

    var _this = {};

    var makeImpl = function(test, maskPattern) {

      _moduleCount = _typeNumber * 4 + 17;
      _modules = function(moduleCount) {
        var modules = new Array(moduleCount);
        for (var row = 0; row < moduleCount; row += 1) {
          modules[row] = new Array(moduleCount);
          for (var col = 0; col < moduleCount; col += 1) {
            modules[row][col] = null;
          }
        }
        return modules;
      }(_moduleCount);

      setupPositionProbePattern(0, 0);
      setupPositionProbePattern(_moduleCount - 7, 0);
      setupPositionProbePattern(0, _moduleCount - 7);
      setupPositionAdjustPattern();
      setupTimingPattern();
      setupTypeInfo(test, maskPattern);

      if (_typeNumber >= 7) {
        setupTypeNumber(test);
      }

      if (_dataCache == null) {
        _dataCache = createData(_typeNumber, _errorCorrectionLevel, _dataList);
      }

      mapData(_dataCache, maskPattern);
    };

    var setupPositionProbePattern = function(row, col) {

      for (var r = -1; r <= 7; r += 1) {

        if (row + r <= -1 || _moduleCount <= row + r) continue;

        for (var c = -1; c <= 7; c += 1) {

          if (col + c <= -1 || _moduleCount <= col + c) continue;

          if ( (0 <= r && r <= 6 && (c == 0 || c == 6) )
              || (0 <= c && c <= 6 && (r == 0 || r == 6) )
              || (2 <= r && r <= 4 && 2 <= c && c <= 4) ) {
            _modules[row + r][col + c] = true;
          } else {
            _modules[row + r][col + c] = false;
          }
        }
      }
    };

    var getBestMaskPattern = function() {

      var minLostPoint = 0;
      var pattern = 0;

      for (var i = 0; i < 8; i += 1) {

        makeImpl(true, i);

        var lostPoint = QRUtil.getLostPoint(_this);

        if (i == 0 || minLostPoint > lostPoint) {
          minLostPoint = lostPoint;
          pattern = i;
        }
      }

      return pattern;
    };

    var setupTimingPattern = function() {

      for (var r = 8; r < _moduleCount - 8; r += 1) {
        if (_modules[r][6] != null) {
          continue;
        }
        _modules[r][6] = (r % 2 == 0);
      }

      for (var c = 8; c < _moduleCount - 8; c += 1) {
        if (_modules[6][c] != null) {
          continue;
        }
        _modules[6][c] = (c % 2 == 0);
      }
    };

    var setupPositionAdjustPattern = function() {

      var pos = QRUtil.getPatternPosition(_typeNumber);

      for (var i = 0; i < pos.length; i += 1) {

        for (var j = 0; j < pos.length; j += 1) {

          var row = pos[i];
          var col = pos[j];

          if (_modules[row][col] != null) {
            continue;
          }

          for (var r = -2; r <= 2; r += 1) {

            for (var c = -2; c <= 2; c += 1) {

              if (r == -2 || r == 2 || c == -2 || c == 2
                  || (r == 0 && c == 0) ) {
                _modules[row + r][col + c] = true;
              } else {
                _modules[row + r][col + c] = false;
              }
            }
          }
        }
      }
    };

    var setupTypeNumber = function(test) {

      var bits = QRUtil.getBCHTypeNumber(_typeNumber);

      for (var i = 0; i < 18; i += 1) {
        var mod = (!test && ( (bits >> i) & 1) == 1);
        _modules[Math.floor(i / 3)][i % 3 + _moduleCount - 8 - 3] = mod;
      }

      for (var i = 0; i < 18; i += 1) {
        var mod = (!test && ( (bits >> i) & 1) == 1);
        _modules[i % 3 + _moduleCount - 8 - 3][Math.floor(i / 3)] = mod;
      }
    };

    var setupTypeInfo = function(test, maskPattern) {

      var data = (_errorCorrectionLevel << 3) | maskPattern;
      var bits = QRUtil.getBCHTypeInfo(data);

      // vertical
      for (var i = 0; i < 15; i += 1) {

        var mod = (!test && ( (bits >> i) & 1) == 1);

        if (i < 6) {
          _modules[i][8] = mod;
        } else if (i < 8) {
          _modules[i + 1][8] = mod;
        } else {
          _modules[_moduleCount - 15 + i][8] = mod;
        }
      }

      // horizontal
      for (var i = 0; i < 15; i += 1) {

        var mod = (!test && ( (bits >> i) & 1) == 1);

        if (i < 8) {
          _modules[8][_moduleCount - i - 1] = mod;
        } else if (i < 9) {
          _modules[8][15 - i - 1 + 1] = mod;
        } else {
          _modules[8][15 - i - 1] = mod;
        }
      }

      // fixed module
      _modules[_moduleCount - 8][8] = (!test);
    };

    var mapData = function(data, maskPattern) {

      var inc = -1;
      var row = _moduleCount - 1;
      var bitIndex = 7;
      var byteIndex = 0;
      var maskFunc = QRUtil.getMaskFunction(maskPattern);

      for (var col = _moduleCount - 1; col > 0; col -= 2) {

        if (col == 6) col -= 1;

        while (true) {

          for (var c = 0; c < 2; c += 1) {

            if (_modules[row][col - c] == null) {

              var dark = false;

              if (byteIndex < data.length) {
                dark = ( ( (data[byteIndex] >>> bitIndex) & 1) == 1);
              }

              var mask = maskFunc(row, col - c);

              if (mask) {
                dark = !dark;
              }

              _modules[row][col - c] = dark;
              bitIndex -= 1;

              if (bitIndex == -1) {
                byteIndex += 1;
                bitIndex = 7;
              }
            }
          }

          row += inc;

          if (row < 0 || _moduleCount <= row) {
            row -= inc;
            inc = -inc;
            break;
          }
        }
      }
    };

    var createBytes = function(buffer, rsBlocks) {

      var offset = 0;

      var maxDcCount = 0;
      var maxEcCount = 0;

      var dcdata = new Array(rsBlocks.length);
      var ecdata = new Array(rsBlocks.length);

      for (var r = 0; r < rsBlocks.length; r += 1) {

        var dcCount = rsBlocks[r].dataCount;
        var ecCount = rsBlocks[r].totalCount - dcCount;

        maxDcCount = Math.max(maxDcCount, dcCount);
        maxEcCount = Math.max(maxEcCount, ecCount);

        dcdata[r] = new Array(dcCount);

        for (var i = 0; i < dcdata[r].length; i += 1) {
          dcdata[r][i] = 0xff & buffer.getBuffer()[i + offset];
        }
        offset += dcCount;

        var rsPoly = QRUtil.getErrorCorrectPolynomial(ecCount);
        var rawPoly = qrPolynomial(dcdata[r], rsPoly.getLength() - 1);

        var modPoly = rawPoly.mod(rsPoly);
        ecdata[r] = new Array(rsPoly.getLength() - 1);
        for (var i = 0; i < ecdata[r].length; i += 1) {
          var modIndex = i + modPoly.getLength() - ecdata[r].length;
          ecdata[r][i] = (modIndex >= 0)? modPoly.getAt(modIndex) : 0;
        }
      }

      var totalCodeCount = 0;
      for (var i = 0; i < rsBlocks.length; i += 1) {
        totalCodeCount += rsBlocks[i].totalCount;
      }

      var data = new Array(totalCodeCount);
      var index = 0;

      for (var i = 0; i < maxDcCount; i += 1) {
        for (var r = 0; r < rsBlocks.length; r += 1) {
          if (i < dcdata[r].length) {
            data[index] = dcdata[r][i];
            index += 1;
          }
        }
      }

      for (var i = 0; i < maxEcCount; i += 1) {
        for (var r = 0; r < rsBlocks.length; r += 1) {
          if (i < ecdata[r].length) {
            data[index] = ecdata[r][i];
            index += 1;
          }
        }
      }

      return data;
    };

    var createData = function(typeNumber, errorCorrectionLevel, dataList) {

      var rsBlocks = QRRSBlock.getRSBlocks(typeNumber, errorCorrectionLevel);

      var buffer = qrBitBuffer();

      for (var i = 0; i < dataList.length; i += 1) {
        var data = dataList[i];
        buffer.put(data.getMode(), 4);
        buffer.put(data.getLength(), QRUtil.getLengthInBits(data.getMode(), typeNumber) );
        data.write(buffer);
      }

      // calc num max data.
      var totalDataCount = 0;
      for (var i = 0; i < rsBlocks.length; i += 1) {
        totalDataCount += rsBlocks[i].dataCount;
      }

      if (buffer.getLengthInBits() > totalDataCount * 8) {
        throw 'code length overflow. ('
          + buffer.getLengthInBits()
          + '>'
          + totalDataCount * 8
          + ')';
      }

      // end code
      if (buffer.getLengthInBits() + 4 <= totalDataCount * 8) {
        buffer.put(0, 4);
      }

      // padding
      while (buffer.getLengthInBits() % 8 != 0) {
        buffer.putBit(false);
      }

      // padding
      while (true) {

        if (buffer.getLengthInBits() >= totalDataCount * 8) {
          break;
        }
        buffer.put(PAD0, 8);

        if (buffer.getLengthInBits() >= totalDataCount * 8) {
          break;
        }
        buffer.put(PAD1, 8);
      }

      return createBytes(buffer, rsBlocks);
    };

    _this.addData = function(data, mode) {

      mode = mode || 'Byte';

      var newData = null;

      switch(mode) {
      case 'Numeric' :
        newData = qrNumber(data);
        break;
      case 'Alphanumeric' :
        newData = qrAlphaNum(data);
        break;
      case 'Byte' :
        newData = qr8BitByte(data);
        break;
      case 'Kanji' :
        newData = qrKanji(data);
        break;
      default :
        throw 'mode:' + mode;
      }

      _dataList.push(newData);
      _dataCache = null;
    };

    _this.isDark = function(row, col) {
      if (row < 0 || _moduleCount <= row || col < 0 || _moduleCount <= col) {
        throw row + ',' + col;
      }
      return _modules[row][col];
    };

    _this.getModuleCount = function() {
      return _moduleCount;
    };

    _this.make = function() {
      if (_typeNumber < 1) {
        var typeNumber = 1;

        for (; typeNumber < 40; typeNumber++) {
          var rsBlocks = QRRSBlock.getRSBlocks(typeNumber, _errorCorrectionLevel);
          var buffer = qrBitBuffer();

          for (var i = 0; i < _dataList.length; i++) {
            var data = _dataList[i];
            buffer.put(data.getMode(), 4);
            buffer.put(data.getLength(), QRUtil.getLengthInBits(data.getMode(), typeNumber) );
            data.write(buffer);
          }

          var totalDataCount = 0;
          for (var i = 0; i < rsBlocks.length; i++) {
            totalDataCount += rsBlocks[i].dataCount;
          }

          if (buffer.getLengthInBits() <= totalDataCount * 8) {
            break;
          }
        }

        _typeNumber = typeNumber;
      }

      makeImpl(false, getBestMaskPattern() );
    };

    _this.createTableTag = function(cellSize, margin) {

      cellSize = cellSize || 2;
      margin = (typeof margin == 'undefined')? cellSize * 4 : margin;

      var qrHtml = '';

      qrHtml += '<table style="';
      qrHtml += ' border-width: 0px; border-style: none;';
      qrHtml += ' border-collapse: collapse;';
      qrHtml += ' padding: 0px; margin: ' + margin + 'px;';
      qrHtml += '">';
      qrHtml += '<tbody>';

      for (var r = 0; r < _this.getModuleCount(); r += 1) {

        qrHtml += '<tr>';

        for (var c = 0; c < _this.getModuleCount(); c += 1) {
          qrHtml += '<td style="';
          qrHtml += ' border-width: 0px; border-style: none;';
          qrHtml += ' border-collapse: collapse;';
          qrHtml += ' padding: 0px; margin: 0px;';
          qrHtml += ' width: ' + cellSize + 'px;';
          qrHtml += ' height: ' + cellSize + 'px;';
          qrHtml += ' background-color: ';
          qrHtml += _this.isDark(r, c)? '#000000' : '#ffffff';
          qrHtml += ';';
          qrHtml += '"/>';
        }

        qrHtml += '</tr>';
      }

      qrHtml += '</tbody>';
      qrHtml += '</table>';

      return qrHtml;
    };

    _this.createSvgTag = function(cellSize, margin, alt, title) {

      var opts = {};
      if (typeof arguments[0] == 'object') {
        // Called by options.
        opts = arguments[0];
        // overwrite cellSize and margin.
        cellSize = opts.cellSize;
        margin = opts.margin;
        alt = opts.alt;
        title = opts.title;
      }

      cellSize = cellSize || 2;
      margin = (typeof margin == 'undefined')? cellSize * 4 : margin;

      // Compose alt property surrogate
      alt = (typeof alt === 'string') ? {text: alt} : alt || {};
      alt.text = alt.text || null;
      alt.id = (alt.text) ? alt.id || 'qrcode-description' : null;

      // Compose title property surrogate
      title = (typeof title === 'string') ? {text: title} : title || {};
      title.text = title.text || null;
      title.id = (title.text) ? title.id || 'qrcode-title' : null;

      var size = _this.getModuleCount() * cellSize + margin * 2;
      var c, mc, r, mr, qrSvg='', rect;

      rect = 'l' + cellSize + ',0 0,' + cellSize +
        ' -' + cellSize + ',0 0,-' + cellSize + 'z ';

      qrSvg += '<svg version="1.1" xmlns="http://www.w3.org/2000/svg"';
      qrSvg += !opts.scalable ? ' width="' + size + 'px" height="' + size + 'px"' : '';
      qrSvg += ' viewBox="0 0 ' + size + ' ' + size + '" ';
      qrSvg += ' preserveAspectRatio="xMinYMin meet"';
      qrSvg += (title.text || alt.text) ? ' role="img" aria-labelledby="' +
          escapeXml([title.id, alt.id].join(' ').trim() ) + '"' : '';
      qrSvg += '>';
      qrSvg += (title.text) ? '<title id="' + escapeXml(title.id) + '">' +
          escapeXml(title.text) + '</title>' : '';
      qrSvg += (alt.text) ? '<description id="' + escapeXml(alt.id) + '">' +
          escapeXml(alt.text) + '</description>' : '';
      qrSvg += '<rect width="100%" height="100%" fill="white" cx="0" cy="0"/>';
      qrSvg += '<path d="';

      for (r = 0; r < _this.getModuleCount(); r += 1) {
        mr = r * cellSize + margin;
        for (c = 0; c < _this.getModuleCount(); c += 1) {
          if (_this.isDark(r, c) ) {
            mc = c*cellSize+margin;
            qrSvg += 'M' + mc + ',' + mr + rect;
          }
        }
      }

      qrSvg += '" stroke="transparent" fill="black"/>';
      qrSvg += '</svg>';

      return qrSvg;
    };

    _this.createDataURL = function(cellSize, margin) {

      cellSize = cellSize || 2;
      margin = (typeof margin == 'undefined')? cellSize * 4 : margin;

      var size = _this.getModuleCount() * cellSize + margin * 2;
      var min = margin;
      var max = size - margin;

      return createDataURL(size, size, function(x, y) {
        if (min <= x && x < max && min <= y && y < max) {
          var c = Math.floor( (x - min) / cellSize);
          var r = Math.floor( (y - min) / cellSize);
          return _this.isDark(r, c)? 0 : 1;
        } else {
          return 1;
        }
      } );
    };

    _this.createImgTag = function(cellSize, margin, alt) {

      cellSize = cellSize || 2;
      margin = (typeof margin == 'undefined')? cellSize * 4 : margin;

      var size = _this.getModuleCount() * cellSize + margin * 2;

      var img = '';
      img += '<img';
      img += '\u0020src="';
      img += _this.createDataURL(cellSize, margin);
      img += '"';
      img += '\u0020width="';
      img += size;
      img += '"';
      img += '\u0020height="';
      img += size;
      img += '"';
      if (alt) {
        img += '\u0020alt="';
        img += escapeXml(alt);
        img += '"';
      }
      img += '/>';

      return img;
    };

    var escapeXml = function(s) {
      var escaped = '';
      for (var i = 0; i < s.length; i += 1) {
        var c = s.charAt(i);
        switch(c) {
        case '<': escaped += '&lt;'; break;
        case '>': escaped += '&gt;'; break;
        case '&': escaped += '&amp;'; break;
        case '"': escaped += '&quot;'; break;
        default : escaped += c; break;
        }
      }
      return escaped;
    };

    var _createHalfASCII = function(margin) {
      var cellSize = 1;
      margin = (typeof margin == 'undefined')? cellSize * 2 : margin;

      var size = _this.getModuleCount() * cellSize + margin * 2;
      var min = margin;
      var max = size - margin;

      var y, x, r1, r2, p;

      var blocks = {
        '██': '█',
        '█ ': '▀',
        ' █': '▄',
        '  ': ' '
      };

      var blocksLastLineNoMargin = {
        '██': '▀',
        '█ ': '▀',
        ' █': ' ',
        '  ': ' '
      };

      var ascii = '';
      for (y = 0; y < size; y += 2) {
        r1 = Math.floor((y - min) / cellSize);
        r2 = Math.floor((y + 1 - min) / cellSize);
        for (x = 0; x < size; x += 1) {
          p = '█';

          if (min <= x && x < max && min <= y && y < max && _this.isDark(r1, Math.floor((x - min) / cellSize))) {
            p = ' ';
          }

          if (min <= x && x < max && min <= y+1 && y+1 < max && _this.isDark(r2, Math.floor((x - min) / cellSize))) {
            p += ' ';
          }
          else {
            p += '█';
          }

          // Output 2 characters per pixel, to create full square. 1 character per pixels gives only half width of square.
          ascii += (margin < 1 && y+1 >= max) ? blocksLastLineNoMargin[p] : blocks[p];
        }

        ascii += '\n';
      }

      if (size % 2 && margin > 0) {
        return ascii.substring(0, ascii.length - size - 1) + Array(size+1).join('▀');
      }

      return ascii.substring(0, ascii.length-1);
    };

    _this.createASCII = function(cellSize, margin) {
      cellSize = cellSize || 1;

      if (cellSize < 2) {
        return _createHalfASCII(margin);
      }

      cellSize -= 1;
      margin = (typeof margin == 'undefined')? cellSize * 2 : margin;

      var size = _this.getModuleCount() * cellSize + margin * 2;
      var min = margin;
      var max = size - margin;

      var y, x, r, p;

      var white = Array(cellSize+1).join('██');
      var black = Array(cellSize+1).join('  ');

      var ascii = '';
      var line = '';
      for (y = 0; y < size; y += 1) {
        r = Math.floor( (y - min) / cellSize);
        line = '';
        for (x = 0; x < size; x += 1) {
          p = 1;

          if (min <= x && x < max && min <= y && y < max && _this.isDark(r, Math.floor((x - min) / cellSize))) {
            p = 0;
          }

          // Output 2 characters per pixel, to create full square. 1 character per pixels gives only half width of square.
          line += p ? white : black;
        }

        for (r = 0; r < cellSize; r += 1) {
          ascii += line + '\n';
        }
      }

      return ascii.substring(0, ascii.length-1);
    };

    _this.renderTo2dContext = function(context, cellSize) {
      cellSize = cellSize || 2;
      var length = _this.getModuleCount();
      for (var row = 0; row < length; row++) {
        for (var col = 0; col < length; col++) {
          context.fillStyle = _this.isDark(row, col) ? 'black' : 'white';
          context.fillRect(col * cellSize, row * cellSize, cellSize, cellSize);
        }
      }
    }

    return _this;
  };

  //---------------------------------------------------------------------
  // qrcode.stringToBytes
  //---------------------------------------------------------------------

  qrcode.stringToBytesFuncs = {
    'default' : function(s) {
      var bytes = [];
      for (var i = 0; i < s.length; i += 1) {
        var c = s.charCodeAt(i);
        bytes.push(c & 0xff);
      }
      return bytes;
    }
  };

  qrcode.stringToBytes = qrcode.stringToBytesFuncs['default'];

  //---------------------------------------------------------------------
  // qrcode.createStringToBytes
  //---------------------------------------------------------------------

  /**
   * @param unicodeData base64 string of byte array.
   * [16bit Unicode],[16bit Bytes], ...
   * @param numChars
   */
  qrcode.createStringToBytes = function(unicodeData, numChars) {

    // create conversion map.

    var unicodeMap = function() {

      var bin = base64DecodeInputStream(unicodeData);
      var read = function() {
        var b = bin.read();
        if (b == -1) throw 'eof';
        return b;
      };

      var count = 0;
      var unicodeMap = {};
      while (true) {
        var b0 = bin.read();
        if (b0 == -1) break;
        var b1 = read();
        var b2 = read();
        var b3 = read();
        var k = String.fromCharCode( (b0 << 8) | b1);
        var v = (b2 << 8) | b3;
        unicodeMap[k] = v;
        count += 1;
      }
      if (count != numChars) {
        throw count + ' != ' + numChars;
      }

      return unicodeMap;
    }();

    var unknownChar = '?'.charCodeAt(0);

    return function(s) {
      var bytes = [];
      for (var i = 0; i < s.length; i += 1) {
        var c = s.charCodeAt(i);
        if (c < 128) {
          bytes.push(c);
        } else {
          var b = unicodeMap[s.charAt(i)];
          if (typeof b == 'number') {
            if ( (b & 0xff) == b) {
              // 1byte
              bytes.push(b);
            } else {
              // 2bytes
              bytes.push(b >>> 8);
              bytes.push(b & 0xff);
            }
          } else {
            bytes.push(unknownChar);
          }
        }
      }
      return bytes;
    };
  };

  //---------------------------------------------------------------------
  // QRMode
  //---------------------------------------------------------------------

  var QRMode = {
    MODE_NUMBER :    1 << 0,
    MODE_ALPHA_NUM : 1 << 1,
    MODE_8BIT_BYTE : 1 << 2,
    MODE_KANJI :     1 << 3
  };

  //---------------------------------------------------------------------
  // QRErrorCorrectionLevel
  //---------------------------------------------------------------------

  var QRErrorCorrectionLevel = {
    L : 1,
    M : 0,
    Q : 3,
    H : 2
  };

  //---------------------------------------------------------------------
  // QRMaskPattern
  //---------------------------------------------------------------------

  var QRMaskPattern = {
    PATTERN000 : 0,
    PATTERN001 : 1,
    PATTERN010 : 2,
    PATTERN011 : 3,
    PATTERN100 : 4,
    PATTERN101 : 5,
    PATTERN110 : 6,
    PATTERN111 : 7
  };

  //---------------------------------------------------------------------
  // QRUtil
  //---------------------------------------------------------------------

  var QRUtil = function() {

    var PATTERN_POSITION_TABLE = [
      [],
      [6, 18],
      [6, 22],
      [6, 26],
      [6, 30],
      [6, 34],
      [6, 22, 38],
      [6, 24, 42],
      [6, 26, 46],
      [6, 28, 50],
      [6, 30, 54],
      [6, 32, 58],
      [6, 34, 62],
      [6, 26, 46, 66],
      [6, 26, 48, 70],
      [6, 26, 50, 74],
      [6, 30, 54, 78],
      [6, 30, 56, 82],
      [6, 30, 58, 86],
      [6, 34, 62, 90],
      [6, 28, 50, 72, 94],
      [6, 26, 50, 74, 98],
      [6, 30, 54, 78, 102],
      [6, 28, 54, 80, 106],
      [6, 32, 58, 84, 110],
      [6, 30, 58, 86, 114],
      [6, 34, 62, 90, 118],
      [6, 26, 50, 74, 98, 122],
      [6, 30, 54, 78, 102, 126],
      [6, 26, 52, 78, 104, 130],
      [6, 30, 56, 82, 108, 134],
      [6, 34, 60, 86, 112, 138],
      [6, 30, 58, 86, 114, 142],
      [6, 34, 62, 90, 118, 146],
      [6, 30, 54, 78, 102, 126, 150],
      [6, 24, 50, 76, 102, 128, 154],
      [6, 28, 54, 80, 106, 132, 158],
      [6, 32, 58, 84, 110, 136, 162],
      [6, 26, 54, 82, 110, 138, 166],
      [6, 30, 58, 86, 114, 142, 170]
    ];
    var G15 = (1 << 10) | (1 << 8) | (1 << 5) | (1 << 4) | (1 << 2) | (1 << 1) | (1 << 0);
    var G18 = (1 << 12) | (1 << 11) | (1 << 10) | (1 << 9) | (1 << 8) | (1 << 5) | (1 << 2) | (1 << 0);
    var G15_MASK = (1 << 14) | (1 << 12) | (1 << 10) | (1 << 4) | (1 << 1);

    var _this = {};

    var getBCHDigit = function(data) {
      var digit = 0;
      while (data != 0) {
        digit += 1;
        data >>>= 1;
      }
      return digit;
    };

    _this.getBCHTypeInfo = function(data) {
      var d = data << 10;
      while (getBCHDigit(d) - getBCHDigit(G15) >= 0) {
        d ^= (G15 << (getBCHDigit(d) - getBCHDigit(G15) ) );
      }
      return ( (data << 10) | d) ^ G15_MASK;
    };

    _this.getBCHTypeNumber = function(data) {
      var d = data << 12;
      while (getBCHDigit(d) - getBCHDigit(G18) >= 0) {
        d ^= (G18 << (getBCHDigit(d) - getBCHDigit(G18) ) );
      }
      return (data << 12) | d;
    };

    _this.getPatternPosition = function(typeNumber) {
      return PATTERN_POSITION_TABLE[typeNumber - 1];
    };

    _this.getMaskFunction = function(maskPattern) {

      switch (maskPattern) {

      case QRMaskPattern.PATTERN000 :
        return function(i, j) { return (i + j) % 2 == 0; };
      case QRMaskPattern.PATTERN001 :
        return function(i, j) { return i % 2 == 0; };
      case QRMaskPattern.PATTERN010 :
        return function(i, j) { return j % 3 == 0; };
      case QRMaskPattern.PATTERN011 :
        return function(i, j) { return (i + j) % 3 == 0; };
      case QRMaskPattern.PATTERN100 :
        return function(i, j) { return (Math.floor(i / 2) + Math.floor(j / 3) ) % 2 == 0; };
      case QRMaskPattern.PATTERN101 :
        return function(i, j) { return (i * j) % 2 + (i * j) % 3 == 0; };
      case QRMaskPattern.PATTERN110 :
        return function(i, j) { return ( (i * j) % 2 + (i * j) % 3) % 2 == 0; };
      case QRMaskPattern.PATTERN111 :
        return function(i, j) { return ( (i * j) % 3 + (i + j) % 2) % 2 == 0; };

      default :
        throw 'bad maskPattern:' + maskPattern;
      }
    };

    _this.getErrorCorrectPolynomial = function(errorCorrectLength) {
      var a = qrPolynomial([1], 0);
      for (var i = 0; i < errorCorrectLength; i += 1) {
        a = a.multiply(qrPolynomial([1, QRMath.gexp(i)], 0) );
      }
      return a;
    };

    _this.getLengthInBits = function(mode, type) {

      if (1 <= type && type < 10) {

        // 1 - 9

        switch(mode) {
        case QRMode.MODE_NUMBER    : return 10;
        case QRMode.MODE_ALPHA_NUM : return 9;
        case QRMode.MODE_8BIT_BYTE : return 8;
        case QRMode.MODE_KANJI     : return 8;
        default :
          throw 'mode:' + mode;
        }

      } else if (type < 27) {

        // 10 - 26

        switch(mode) {
        case QRMode.MODE_NUMBER    : return 12;
        case QRMode.MODE_ALPHA_NUM : return 11;
        case QRMode.MODE_8BIT_BYTE : return 16;
        case QRMode.MODE_KANJI     : return 10;
        default :
          throw 'mode:' + mode;
        }

      } else if (type < 41) {

        // 27 - 40

        switch(mode) {
        case QRMode.MODE_NUMBER    : return 14;
        case QRMode.MODE_ALPHA_NUM : return 13;
        case QRMode.MODE_8BIT_BYTE : return 16;
        case QRMode.MODE_KANJI     : return 12;
        default :
          throw 'mode:' + mode;
        }

      } else {
        throw 'type:' + type;
      }
    };

    _this.getLostPoint = function(qrcode) {

      var moduleCount = qrcode.getModuleCount();

      var lostPoint = 0;

      // LEVEL1

      for (var row = 0; row < moduleCount; row += 1) {
        for (var col = 0; col < moduleCount; col += 1) {

          var sameCount = 0;
          var dark = qrcode.isDark(row, col);

          for (var r = -1; r <= 1; r += 1) {

            if (row + r < 0 || moduleCount <= row + r) {
              continue;
            }

            for (var c = -1; c <= 1; c += 1) {

              if (col + c < 0 || moduleCount <= col + c) {
                continue;
              }

              if (r == 0 && c == 0) {
                continue;
              }

              if (dark == qrcode.isDark(row + r, col + c) ) {
                sameCount += 1;
              }
            }
          }

          if (sameCount > 5) {
            lostPoint += (3 + sameCount - 5);
          }
        }
      };

      // LEVEL2

      for (var row = 0; row < moduleCount - 1; row += 1) {
        for (var col = 0; col < moduleCount - 1; col += 1) {
          var count = 0;
          if (qrcode.isDark(row, col) ) count += 1;
          if (qrcode.isDark(row + 1, col) ) count += 1;
          if (qrcode.isDark(row, col + 1) ) count += 1;
          if (qrcode.isDark(row + 1, col + 1) ) count += 1;
          if (count == 0 || count == 4) {
            lostPoint += 3;
          }
        }
      }

      // LEVEL3

      for (var row = 0; row < moduleCount; row += 1) {
        for (var col = 0; col < moduleCount - 6; col += 1) {
          if (qrcode.isDark(row, col)
              && !qrcode.isDark(row, col + 1)
              &&  qrcode.isDark(row, col + 2)
              &&  qrcode.isDark(row, col + 3)
              &&  qrcode.isDark(row, col + 4)
              && !qrcode.isDark(row, col + 5)
              &&  qrcode.isDark(row, col + 6) ) {
            lostPoint += 40;
          }
        }
      }

      for (var col = 0; col < moduleCount; col += 1) {
        for (var row = 0; row < moduleCount - 6; row += 1) {
          if (qrcode.isDark(row, col)
              && !qrcode.isDark(row + 1, col)
              &&  qrcode.isDark(row + 2, col)
              &&  qrcode.isDark(row + 3, col)
              &&  qrcode.isDark(row + 4, col)
              && !qrcode.isDark(row + 5, col)
              &&  qrcode.isDark(row + 6, col) ) {
            lostPoint += 40;
          }
        }
      }

      // LEVEL4

      var darkCount = 0;

      for (var col = 0; col < moduleCount; col += 1) {
        for (var row = 0; row < moduleCount; row += 1) {
          if (qrcode.isDark(row, col) ) {
            darkCount += 1;
          }
        }
      }

      var ratio = Math.abs(100 * darkCount / moduleCount / moduleCount - 50) / 5;
      lostPoint += ratio * 10;

      return lostPoint;
    };

    return _this;
  }();

  //---------------------------------------------------------------------
  // QRMath
  //---------------------------------------------------------------------

  var QRMath = function() {

    var EXP_TABLE = new Array(256);
    var LOG_TABLE = new Array(256);

    // initialize tables
    for (var i = 0; i < 8; i += 1) {
      EXP_TABLE[i] = 1 << i;
    }
    for (var i = 8; i < 256; i += 1) {
      EXP_TABLE[i] = EXP_TABLE[i - 4]
        ^ EXP_TABLE[i - 5]
        ^ EXP_TABLE[i - 6]
        ^ EXP_TABLE[i - 8];
    }
    for (var i = 0; i < 255; i += 1) {
      LOG_TABLE[EXP_TABLE[i] ] = i;
    }

    var _this = {};

    _this.glog = function(n) {

      if (n < 1) {
        throw 'glog(' + n + ')';
      }

      return LOG_TABLE[n];
    };

    _this.gexp = function(n) {

      while (n < 0) {
        n += 255;
      }

      while (n >= 256) {
        n -= 255;
      }

      return EXP_TABLE[n];
    };

    return _this;
  }();

  //---------------------------------------------------------------------
  // qrPolynomial
  //---------------------------------------------------------------------

  function qrPolynomial(num, shift) {

    if (typeof num.length == 'undefined') {
      throw num.length + '/' + shift;
    }

    var _num = function() {
      var offset = 0;
      while (offset < num.length && num[offset] == 0) {
        offset += 1;
      }
      var _num = new Array(num.length - offset + shift);
      for (var i = 0; i < num.length - offset; i += 1) {
        _num[i] = num[i + offset];
      }
      return _num;
    }();

    var _this = {};

    _this.getAt = function(index) {
      return _num[index];
    };

    _this.getLength = function() {
      return _num.length;
    };

    _this.multiply = function(e) {

      var num = new Array(_this.getLength() + e.getLength() - 1);

      for (var i = 0; i < _this.getLength(); i += 1) {
        for (var j = 0; j < e.getLength(); j += 1) {
          num[i + j] ^= QRMath.gexp(QRMath.glog(_this.getAt(i) ) + QRMath.glog(e.getAt(j) ) );
        }
      }

      return qrPolynomial(num, 0);
    };

    _this.mod = function(e) {

      if (_this.getLength() - e.getLength() < 0) {
        return _this;
      }

      var ratio = QRMath.glog(_this.getAt(0) ) - QRMath.glog(e.getAt(0) );

      var num = new Array(_this.getLength() );
      for (var i = 0; i < _this.getLength(); i += 1) {
        num[i] = _this.getAt(i);
      }

      for (var i = 0; i < e.getLength(); i += 1) {
        num[i] ^= QRMath.gexp(QRMath.glog(e.getAt(i) ) + ratio);
      }

      // recursive call
      return qrPolynomial(num, 0).mod(e);
    };

    return _this;
  };

  //---------------------------------------------------------------------
  // QRRSBlock
  //---------------------------------------------------------------------

  var QRRSBlock = function() {

    var RS_BLOCK_TABLE = [

      // L
      // M
      // Q
      // H

      // 1
      [1, 26, 19],
      [1, 26, 16],
      [1, 26, 13],
      [1, 26, 9],

      // 2
      [1, 44, 34],
      [1, 44, 28],
      [1, 44, 22],
      [1, 44, 16],

      // 3
      [1, 70, 55],
      [1, 70, 44],
      [2, 35, 17],
      [2, 35, 13],

      // 4
      [1, 100, 80],
      [2, 50, 32],
      [2, 50, 24],
      [4, 25, 9],

      // 5
      [1, 134, 108],
      [2, 67, 43],
      [2, 33, 15, 2, 34, 16],
      [2, 33, 11, 2, 34, 12],

      // 6
      [2, 86, 68],
      [4, 43, 27],
      [4, 43, 19],
      [4, 43, 15],

      // 7
      [2, 98, 78],
      [4, 49, 31],
      [2, 32, 14, 4, 33, 15],
      [4, 39, 13, 1, 40, 14],

      // 8
      [2, 121, 97],
      [2, 60, 38, 2, 61, 39],
      [4, 40, 18, 2, 41, 19],
      [4, 40, 14, 2, 41, 15],

      // 9
      [2, 146, 116],
      [3, 58, 36, 2, 59, 37],
      [4, 36, 16, 4, 37, 17],
      [4, 36, 12, 4, 37, 13],

      // 10
      [2, 86, 68, 2, 87, 69],
      [4, 69, 43, 1, 70, 44],
      [6, 43, 19, 2, 44, 20],
      [6, 43, 15, 2, 44, 16],

      // 11
      [4, 101, 81],
      [1, 80, 50, 4, 81, 51],
      [4, 50, 22, 4, 51, 23],
      [3, 36, 12, 8, 37, 13],

      // 12
      [2, 116, 92, 2, 117, 93],
      [6, 58, 36, 2, 59, 37],
      [4, 46, 20, 6, 47, 21],
      [7, 42, 14, 4, 43, 15],

      // 13
      [4, 133, 107],
      [8, 59, 37, 1, 60, 38],
      [8, 44, 20, 4, 45, 21],
      [12, 33, 11, 4, 34, 12],

      // 14
      [3, 145, 115, 1, 146, 116],
      [4, 64, 40, 5, 65, 41],
      [11, 36, 16, 5, 37, 17],
      [11, 36, 12, 5, 37, 13],

      // 15
      [5, 109, 87, 1, 110, 88],
      [5, 65, 41, 5, 66, 42],
      [5, 54, 24, 7, 55, 25],
      [11, 36, 12, 7, 37, 13],

      // 16
      [5, 122, 98, 1, 123, 99],
      [7, 73, 45, 3, 74, 46],
      [15, 43, 19, 2, 44, 20],
      [3, 45, 15, 13, 46, 16],

      // 17
      [1, 135, 107, 5, 136, 108],
      [10, 74, 46, 1, 75, 47],
      [1, 50, 22, 15, 51, 23],
      [2, 42, 14, 17, 43, 15],

      // 18
      [5, 150, 120, 1, 151, 121],
      [9, 69, 43, 4, 70, 44],
      [17, 50, 22, 1, 51, 23],
      [2, 42, 14, 19, 43, 15],

      // 19
      [3, 141, 113, 4, 142, 114],
      [3, 70, 44, 11, 71, 45],
      [17, 47, 21, 4, 48, 22],
      [9, 39, 13, 16, 40, 14],

      // 20
      [3, 135, 107, 5, 136, 108],
      [3, 67, 41, 13, 68, 42],
      [15, 54, 24, 5, 55, 25],
      [15, 43, 15, 10, 44, 16],

      // 21
      [4, 144, 116, 4, 145, 117],
      [17, 68, 42],
      [17, 50, 22, 6, 51, 23],
      [19, 46, 16, 6, 47, 17],

      // 22
      [2, 139, 111, 7, 140, 112],
      [17, 74, 46],
      [7, 54, 24, 16, 55, 25],
      [34, 37, 13],

      // 23
      [4, 151, 121, 5, 152, 122],
      [4, 75, 47, 14, 76, 48],
      [11, 54, 24, 14, 55, 25],
      [16, 45, 15, 14, 46, 16],

      // 24
      [6, 147, 117, 4, 148, 118],
      [6, 73, 45, 14, 74, 46],
      [11, 54, 24, 16, 55, 25],
      [30, 46, 16, 2, 47, 17],

      // 25
      [8, 132, 106, 4, 133, 107],
      [8, 75, 47, 13, 76, 48],
      [7, 54, 24, 22, 55, 25],
      [22, 45, 15, 13, 46, 16],

      // 26
      [10, 142, 114, 2, 143, 115],
      [19, 74, 46, 4, 75, 47],
      [28, 50, 22, 6, 51, 23],
      [33, 46, 16, 4, 47, 17],

      // 27
      [8, 152, 122, 4, 153, 123],
      [22, 73, 45, 3, 74, 46],
      [8, 53, 23, 26, 54, 24],
      [12, 45, 15, 28, 46, 16],

      // 28
      [3, 147, 117, 10, 148, 118],
      [3, 73, 45, 23, 74, 46],
      [4, 54, 24, 31, 55, 25],
      [11, 45, 15, 31, 46, 16],

      // 29
      [7, 146, 116, 7, 147, 117],
      [21, 73, 45, 7, 74, 46],
      [1, 53, 23, 37, 54, 24],
      [19, 45, 15, 26, 46, 16],

      // 30
      [5, 145, 115, 10, 146, 116],
      [19, 75, 47, 10, 76, 48],
      [15, 54, 24, 25, 55, 25],
      [23, 45, 15, 25, 46, 16],

      // 31
      [13, 145, 115, 3, 146, 116],
      [2, 74, 46, 29, 75, 47],
      [42, 54, 24, 1, 55, 25],
      [23, 45, 15, 28, 46, 16],

      // 32
      [17, 145, 115],
      [10, 74, 46, 23, 75, 47],
      [10, 54, 24, 35, 55, 25],
      [19, 45, 15, 35, 46, 16],

      // 33
      [17, 145, 115, 1, 146, 116],
      [14, 74, 46, 21, 75, 47],
      [29, 54, 24, 19, 55, 25],
      [11, 45, 15, 46, 46, 16],

      // 34
      [13, 145, 115, 6, 146, 116],
      [14, 74, 46, 23, 75, 47],
      [44, 54, 24, 7, 55, 25],
      [59, 46, 16, 1, 47, 17],

      // 35
      [12, 151, 121, 7, 152, 122],
      [12, 75, 47, 26, 76, 48],
      [39, 54, 24, 14, 55, 25],
      [22, 45, 15, 41, 46, 16],

      // 36
      [6, 151, 121, 14, 152, 122],
      [6, 75, 47, 34, 76, 48],
      [46, 54, 24, 10, 55, 25],
      [2, 45, 15, 64, 46, 16],

      // 37
      [17, 152, 122, 4, 153, 123],
      [29, 74, 46, 14, 75, 47],
      [49, 54, 24, 10, 55, 25],
      [24, 45, 15, 46, 46, 16],

      // 38
      [4, 152, 122, 18, 153, 123],
      [13, 74, 46, 32, 75, 47],
      [48, 54, 24, 14, 55, 25],
      [42, 45, 15, 32, 46, 16],

      // 39
      [20, 147, 117, 4, 148, 118],
      [40, 75, 47, 7, 76, 48],
      [43, 54, 24, 22, 55, 25],
      [10, 45, 15, 67, 46, 16],

      // 40
      [19, 148, 118, 6, 149, 119],
      [18, 75, 47, 31, 76, 48],
      [34, 54, 24, 34, 55, 25],
      [20, 45, 15, 61, 46, 16]
    ];

    var qrRSBlock = function(totalCount, dataCount) {
      var _this = {};
      _this.totalCount = totalCount;
      _this.dataCount = dataCount;
      return _this;
    };

    var _this = {};

    var getRsBlockTable = function(typeNumber, errorCorrectionLevel) {

      switch(errorCorrectionLevel) {
      case QRErrorCorrectionLevel.L :
        return RS_BLOCK_TABLE[(typeNumber - 1) * 4 + 0];
      case QRErrorCorrectionLevel.M :
        return RS_BLOCK_TABLE[(typeNumber - 1) * 4 + 1];
      case QRErrorCorrectionLevel.Q :
        return RS_BLOCK_TABLE[(typeNumber - 1) * 4 + 2];
      case QRErrorCorrectionLevel.H :
        return RS_BLOCK_TABLE[(typeNumber - 1) * 4 + 3];
      default :
        return undefined;
      }
    };

    _this.getRSBlocks = function(typeNumber, errorCorrectionLevel) {

      var rsBlock = getRsBlockTable(typeNumber, errorCorrectionLevel);

      if (typeof rsBlock == 'undefined') {
        throw 'bad rs block @ typeNumber:' + typeNumber +
            '/errorCorrectionLevel:' + errorCorrectionLevel;
      }

      var length = rsBlock.length / 3;

      var list = [];

      for (var i = 0; i < length; i += 1) {

        var count = rsBlock[i * 3 + 0];
        var totalCount = rsBlock[i * 3 + 1];
        var dataCount = rsBlock[i * 3 + 2];

        for (var j = 0; j < count; j += 1) {
          list.push(qrRSBlock(totalCount, dataCount) );
        }
      }

      return list;
    };

    return _this;
  }();

  //---------------------------------------------------------------------
  // qrBitBuffer
  //---------------------------------------------------------------------

  var qrBitBuffer = function() {

    var _buffer = [];
    var _length = 0;

    var _this = {};

    _this.getBuffer = function() {
      return _buffer;
    };

    _this.getAt = function(index) {
      var bufIndex = Math.floor(index / 8);
      return ( (_buffer[bufIndex] >>> (7 - index % 8) ) & 1) == 1;
    };

    _this.put = function(num, length) {
      for (var i = 0; i < length; i += 1) {
        _this.putBit( ( (num >>> (length - i - 1) ) & 1) == 1);
      }
    };

    _this.getLengthInBits = function() {
      return _length;
    };

    _this.putBit = function(bit) {

      var bufIndex = Math.floor(_length / 8);
      if (_buffer.length <= bufIndex) {
        _buffer.push(0);
      }

      if (bit) {
        _buffer[bufIndex] |= (0x80 >>> (_length % 8) );
      }

      _length += 1;
    };

    return _this;
  };

  //---------------------------------------------------------------------
  // qrNumber
  //---------------------------------------------------------------------

  var qrNumber = function(data) {

    var _mode = QRMode.MODE_NUMBER;
    var _data = data;

    var _this = {};

    _this.getMode = function() {
      return _mode;
    };

    _this.getLength = function(buffer) {
      return _data.length;
    };

    _this.write = function(buffer) {

      var data = _data;

      var i = 0;

      while (i + 2 < data.length) {
        buffer.put(strToNum(data.substring(i, i + 3) ), 10);
        i += 3;
      }

      if (i < data.length) {
        if (data.length - i == 1) {
          buffer.put(strToNum(data.substring(i, i + 1) ), 4);
        } else if (data.length - i == 2) {
          buffer.put(strToNum(data.substring(i, i + 2) ), 7);
        }
      }
    };

    var strToNum = function(s) {
      var num = 0;
      for (var i = 0; i < s.length; i += 1) {
        num = num * 10 + chatToNum(s.charAt(i) );
      }
      return num;
    };

    var chatToNum = function(c) {
      if ('0' <= c && c <= '9') {
        return c.charCodeAt(0) - '0'.charCodeAt(0);
      }
      throw 'illegal char :' + c;
    };

    return _this;
  };

  //---------------------------------------------------------------------
  // qrAlphaNum
  //---------------------------------------------------------------------

  var qrAlphaNum = function(data) {

    var _mode = QRMode.MODE_ALPHA_NUM;
    var _data = data;

    var _this = {};

    _this.getMode = function() {
      return _mode;
    };

    _this.getLength = function(buffer) {
      return _data.length;
    };

    _this.write = function(buffer) {

      var s = _data;

      var i = 0;

      while (i + 1 < s.length) {
        buffer.put(
          getCode(s.charAt(i) ) * 45 +
          getCode(s.charAt(i + 1) ), 11);
        i += 2;
      }

      if (i < s.length) {
        buffer.put(getCode(s.charAt(i) ), 6);
      }
    };

    var getCode = function(c) {

      if ('0' <= c && c <= '9') {
        return c.charCodeAt(0) - '0'.charCodeAt(0);
      } else if ('A' <= c && c <= 'Z') {
        return c.charCodeAt(0) - 'A'.charCodeAt(0) + 10;
      } else {
        switch (c) {
        case ' ' : return 36;
        case '$' : return 37;
        case '%' : return 38;
        case '*' : return 39;
        case '+' : return 40;
        case '-' : return 41;
        case '.' : return 42;
        case '/' : return 43;
        case ':' : return 44;
        default :
          throw 'illegal char :' + c;
        }
      }
    };

    return _this;
  };

  //---------------------------------------------------------------------
  // qr8BitByte
  //---------------------------------------------------------------------

  var qr8BitByte = function(data) {

    var _mode = QRMode.MODE_8BIT_BYTE;
    var _data = data;
    var _bytes = qrcode.stringToBytes(data);

    var _this = {};

    _this.getMode = function() {
      return _mode;
    };

    _this.getLength = function(buffer) {
      return _bytes.length;
    };

    _this.write = function(buffer) {
      for (var i = 0; i < _bytes.length; i += 1) {
        buffer.put(_bytes[i], 8);
      }
    };

    return _this;
  };

  //---------------------------------------------------------------------
  // qrKanji
  //---------------------------------------------------------------------

  var qrKanji = function(data) {

    var _mode = QRMode.MODE_KANJI;
    var _data = data;

    var stringToBytes = qrcode.stringToBytesFuncs['SJIS'];
    if (!stringToBytes) {
      throw 'sjis not supported.';
    }
    !function(c, code) {
      // self test for sjis support.
      var test = stringToBytes(c);
      if (test.length != 2 || ( (test[0] << 8) | test[1]) != code) {
        throw 'sjis not supported.';
      }
    }('\u53cb', 0x9746);

    var _bytes = stringToBytes(data);

    var _this = {};

    _this.getMode = function() {
      return _mode;
    };

    _this.getLength = function(buffer) {
      return ~~(_bytes.length / 2);
    };

    _this.write = function(buffer) {

      var data = _bytes;

      var i = 0;

      while (i + 1 < data.length) {

        var c = ( (0xff & data[i]) << 8) | (0xff & data[i + 1]);

        if (0x8140 <= c && c <= 0x9FFC) {
          c -= 0x8140;
        } else if (0xE040 <= c && c <= 0xEBBF) {
          c -= 0xC140;
        } else {
          throw 'illegal char at ' + (i + 1) + '/' + c;
        }

        c = ( (c >>> 8) & 0xff) * 0xC0 + (c & 0xff);

        buffer.put(c, 13);

        i += 2;
      }

      if (i < data.length) {
        throw 'illegal char at ' + (i + 1);
      }
    };

    return _this;
  };

  //=====================================================================
  // GIF Support etc.
  //

  //---------------------------------------------------------------------
  // byteArrayOutputStream
  //---------------------------------------------------------------------

  var byteArrayOutputStream = function() {

    var _bytes = [];

    var _this = {};

    _this.writeByte = function(b) {
      _bytes.push(b & 0xff);
    };

    _this.writeShort = function(i) {
      _this.writeByte(i);
      _this.writeByte(i >>> 8);
    };

    _this.writeBytes = function(b, off, len) {
      off = off || 0;
      len = len || b.length;
      for (var i = 0; i < len; i += 1) {
        _this.writeByte(b[i + off]);
      }
    };

    _this.writeString = function(s) {
      for (var i = 0; i < s.length; i += 1) {
        _this.writeByte(s.charCodeAt(i) );
      }
    };

    _this.toByteArray = function() {
      return _bytes;
    };

    _this.toString = function() {
      var s = '';
      s += '[';
      for (var i = 0; i < _bytes.length; i += 1) {
        if (i > 0) {
          s += ',';
        }
        s += _bytes[i];
      }
      s += ']';
      return s;
    };

    return _this;
  };

  //---------------------------------------------------------------------
  // base64EncodeOutputStream
  //---------------------------------------------------------------------

  var base64EncodeOutputStream = function() {

    var _buffer = 0;
    var _buflen = 0;
    var _length = 0;
    var _base64 = '';

    var _this = {};

    var writeEncoded = function(b) {
      _base64 += String.fromCharCode(encode(b & 0x3f) );
    };

    var encode = function(n) {
      if (n < 0) {
        // error.
      } else if (n < 26) {
        return 0x41 + n;
      } else if (n < 52) {
        return 0x61 + (n - 26);
      } else if (n < 62) {
        return 0x30 + (n - 52);
      } else if (n == 62) {
        return 0x2b;
      } else if (n == 63) {
        return 0x2f;
      }
      throw 'n:' + n;
    };

    _this.writeByte = function(n) {

      _buffer = (_buffer << 8) | (n & 0xff);
      _buflen += 8;
      _length += 1;

      while (_buflen >= 6) {
        writeEncoded(_buffer >>> (_buflen - 6) );
        _buflen -= 6;
      }
    };

    _this.flush = function() {

      if (_buflen > 0) {
        writeEncoded(_buffer << (6 - _buflen) );
        _buffer = 0;
        _buflen = 0;
      }

      if (_length % 3 != 0) {
        // padding
        var padlen = 3 - _length % 3;
        for (var i = 0; i < padlen; i += 1) {
          _base64 += '=';
        }
      }
    };

    _this.toString = function() {
      return _base64;
    };

    return _this;
  };

  //---------------------------------------------------------------------
  // base64DecodeInputStream
  //---------------------------------------------------------------------

  var base64DecodeInputStream = function(str) {

    var _str = str;
    var _pos = 0;
    var _buffer = 0;
    var _buflen = 0;

    var _this = {};

    _this.read = function() {

      while (_buflen < 8) {

        if (_pos >= _str.length) {
          if (_buflen == 0) {
            return -1;
          }
          throw 'unexpected end of file./' + _buflen;
        }

        var c = _str.charAt(_pos);
        _pos += 1;

        if (c == '=') {
          _buflen = 0;
          return -1;
        } else if (c.match(/^\s$/) ) {
          // ignore if whitespace.
          continue;
        }

        _buffer = (_buffer << 6) | decode(c.charCodeAt(0) );
        _buflen += 6;
      }

      var n = (_buffer >>> (_buflen - 8) ) & 0xff;
      _buflen -= 8;
      return n;
    };

    var decode = function(c) {
      if (0x41 <= c && c <= 0x5a) {
        return c - 0x41;
      } else if (0x61 <= c && c <= 0x7a) {
        return c - 0x61 + 26;
      } else if (0x30 <= c && c <= 0x39) {
        return c - 0x30 + 52;
      } else if (c == 0x2b) {
        return 62;
      } else if (c == 0x2f) {
        return 63;
      } else {
        throw 'c:' + c;
      }
    };

    return _this;
  };

  //---------------------------------------------------------------------
  // gifImage (B/W)
  //---------------------------------------------------------------------

  var gifImage = function(width, height) {

    var _width = width;
    var _height = height;
    var _data = new Array(width * height);

    var _this = {};

    _this.setPixel = function(x, y, pixel) {
      _data[y * _width + x] = pixel;
    };

    _this.write = function(out) {

      //---------------------------------
      // GIF Signature

      out.writeString('GIF87a');

      //---------------------------------
      // Screen Descriptor

      out.writeShort(_width);
      out.writeShort(_height);

      out.writeByte(0x80); // 2bit
      out.writeByte(0);
      out.writeByte(0);

      //---------------------------------
      // Global Color Map

      // black
      out.writeByte(0x00);
      out.writeByte(0x00);
      out.writeByte(0x00);

      // white
      out.writeByte(0xff);
      out.writeByte(0xff);
      out.writeByte(0xff);

      //---------------------------------
      // Image Descriptor

      out.writeString(',');
      out.writeShort(0);
      out.writeShort(0);
      out.writeShort(_width);
      out.writeShort(_height);
      out.writeByte(0);

      //---------------------------------
      // Local Color Map

      //---------------------------------
      // Raster Data

      var lzwMinCodeSize = 2;
      var raster = getLZWRaster(lzwMinCodeSize);

      out.writeByte(lzwMinCodeSize);

      var offset = 0;

      while (raster.length - offset > 255) {
        out.writeByte(255);
        out.writeBytes(raster, offset, 255);
        offset += 255;
      }

      out.writeByte(raster.length - offset);
      out.writeBytes(raster, offset, raster.length - offset);
      out.writeByte(0x00);

      //---------------------------------
      // GIF Terminator
      out.writeString(';');
    };

    var bitOutputStream = function(out) {

      var _out = out;
      var _bitLength = 0;
      var _bitBuffer = 0;

      var _this = {};

      _this.write = function(data, length) {

        if ( (data >>> length) != 0) {
          throw 'length over';
        }

        while (_bitLength + length >= 8) {
          _out.writeByte(0xff & ( (data << _bitLength) | _bitBuffer) );
          length -= (8 - _bitLength);
          data >>>= (8 - _bitLength);
          _bitBuffer = 0;
          _bitLength = 0;
        }

        _bitBuffer = (data << _bitLength) | _bitBuffer;
        _bitLength = _bitLength + length;
      };

      _this.flush = function() {
        if (_bitLength > 0) {
          _out.writeByte(_bitBuffer);
        }
      };

      return _this;
    };

    var getLZWRaster = function(lzwMinCodeSize) {

      var clearCode = 1 << lzwMinCodeSize;
      var endCode = (1 << lzwMinCodeSize) + 1;
      var bitLength = lzwMinCodeSize + 1;

      // Setup LZWTable
      var table = lzwTable();

      for (var i = 0; i < clearCode; i += 1) {
        table.add(String.fromCharCode(i) );
      }
      table.add(String.fromCharCode(clearCode) );
      table.add(String.fromCharCode(endCode) );

      var byteOut = byteArrayOutputStream();
      var bitOut = bitOutputStream(byteOut);

      // clear code
      bitOut.write(clearCode, bitLength);

      var dataIndex = 0;

      var s = String.fromCharCode(_data[dataIndex]);
      dataIndex += 1;

      while (dataIndex < _data.length) {

        var c = String.fromCharCode(_data[dataIndex]);
        dataIndex += 1;

        if (table.contains(s + c) ) {

          s = s + c;

        } else {

          bitOut.write(table.indexOf(s), bitLength);

          if (table.size() < 0xfff) {

            if (table.size() == (1 << bitLength) ) {
              bitLength += 1;
            }

            table.add(s + c);
          }

          s = c;
        }
      }

      bitOut.write(table.indexOf(s), bitLength);

      // end code
      bitOut.write(endCode, bitLength);

      bitOut.flush();

      return byteOut.toByteArray();
    };

    var lzwTable = function() {

      var _map = {};
      var _size = 0;

      var _this = {};

      _this.add = function(key) {
        if (_this.contains(key) ) {
          throw 'dup key:' + key;
        }
        _map[key] = _size;
        _size += 1;
      };

      _this.size = function() {
        return _size;
      };

      _this.indexOf = function(key) {
        return _map[key];
      };

      _this.contains = function(key) {
        return typeof _map[key] != 'undefined';
      };

      return _this;
    };

    return _this;
  };

  var createDataURL = function(width, height, getPixel) {
    var gif = gifImage(width, height);
    for (var y = 0; y < height; y += 1) {
      for (var x = 0; x < width; x += 1) {
        gif.setPixel(x, y, getPixel(x, y) );
      }
    }

    var b = byteArrayOutputStream();
    gif.write(b);

    var base64 = base64EncodeOutputStream();
    var bytes = b.toByteArray();
    for (var i = 0; i < bytes.length; i += 1) {
      base64.writeByte(bytes[i]);
    }
    base64.flush();

    return 'data:image/gif;base64,' + base64;
  };

  //---------------------------------------------------------------------
  // returns qrcode function.

  return qrcode;
}();

// multibyte support
!function() {

  qrcode.stringToBytesFuncs['UTF-8'] = function(s) {
    // http://stackoverflow.com/questions/18729405/how-to-convert-utf8-string-to-byte-array
    function toUTF8Array(str) {
      var utf8 = [];
      for (var i=0; i < str.length; i++) {
        var charcode = str.charCodeAt(i);
        if (charcode < 0x80) utf8.push(charcode);
        else if (charcode < 0x800) {
          utf8.push(0xc0 | (charcode >> 6),
              0x80 | (charcode & 0x3f));
        }
        else if (charcode < 0xd800 || charcode >= 0xe000) {
          utf8.push(0xe0 | (charcode >> 12),
              0x80 | ((charcode>>6) & 0x3f),
              0x80 | (charcode & 0x3f));
        }
        // surrogate pair
        else {
          i++;
          // UTF-16 encodes 0x10000-0x10FFFF by
          // subtracting 0x10000 and splitting the
          // 20 bits of 0x0-0xFFFFF into two halves
          charcode = 0x10000 + (((charcode & 0x3ff)<<10)
            | (str.charCodeAt(i) & 0x3ff));
          utf8.push(0xf0 | (charcode >>18),
              0x80 | ((charcode>>12) & 0x3f),
              0x80 | ((charcode>>6) & 0x3f),
              0x80 | (charcode & 0x3f));
        }
      }
      return utf8;
    }
    return toUTF8Array(s);
  };

}();

(function (factory) {
  if (typeof define === 'function' && define.amd) {
      define([], factory);
  } else if (typeof exports === 'object') {
      module.exports = factory();
  }
}(function () {
    return qrcode;
}));

/* ===== End inlined QR generator ===== */

console.log("Enterprise ERP Engine Initialized");

// ==========================================
// 1. CLOUD SYNC & LOCAL STATE
// ==========================================
// ==========================================
// 1. CONFIG, CLOUD, GEMINI & LICENSE STATE
// ==========================================
// MASTER_KEY is an owner override that unlocks the app without the Google Sheet.
// NOTE: this lives in client code, so treat it like a shared admin password, not
// bank-grade security. The authoritative copy is the MASTER_KEY in your Apps Script.
const MASTER_KEY = "OMBETAR-MASTER-7788";

// Gemini REST endpoint base (model is taken from Settings, default gemini-2.5-flash).
const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta/models";

// Backwards-compatible cloud push (now reads the URL from Settings).
async function pushSaleToCloud(billData) {
    const prov = (shopSettings && shopSettings.cloudProvider) || 'sheets';
    if (prov === 'firebase') return; // firebaseSyncAll covers it
    const url = (shopSettings && shopSettings.cloudUrl) ? shopSettings.cloudUrl.trim() : "";
    if (!url) return;
    try {
        await fetch(url, {
            method: 'POST',
            redirect: 'follow',
            body: JSON.stringify({ action: 'sale', license: licenseState.key, deviceId: getDeviceId(), sale: billData })
        });
        console.log("✅ Sale pushed to Google Sheet");
    } catch (err) { console.warn("Cloud push failed (will retry on next Sync Now):", err); }
}

let isolatedInventory = { Pharmacy: [], Electronics: [], Jewelry: [], Grocery: [] };
try {
    let loadedInventory = JSON.parse(localStorage.getItem('myBusinessInventory'));
    if (Array.isArray(loadedInventory)) { 
        isolatedInventory['Electronics'] = loadedInventory; 
        localStorage.setItem('myBusinessInventory', JSON.stringify(isolatedInventory));
    } else if (loadedInventory && typeof loadedInventory === 'object') { 
        isolatedInventory = { ...isolatedInventory, ...loadedInventory }; 
    }
} catch(e) {}

let billHistoryData = JSON.parse(localStorage.getItem('myBusinessBillHistory')) || [];
let purchaseHistoryData = JSON.parse(localStorage.getItem('myBusinessPurchases')) || [];
let customerLedgerData = JSON.parse(localStorage.getItem('myBusinessLedger')) || {};
let vendorLedgerData = JSON.parse(localStorage.getItem('myVendorLedger')) || {};
let shopSettings = { shopName: 'Om Betar Bhawan', address: '', phone: '', gst: '', terms: '', bankName: '', bankAcc: '', bankIfsc: '', logoData: '', printFormat: 'a4',
    aiEngine: 'tesseract', geminiKey: '', geminiModel: 'gemini-2.5-flash',
    cloudProvider: 'sheets', cloudUrl: '', firebaseConfig: '',
    upiId: '', upiName: '', showUpiQr: 'yes' };

try { let savedSettings = JSON.parse(localStorage.getItem('myBusinessSettings')); if(savedSettings) shopSettings = { ...shopSettings, ...savedSettings }; } catch(e){}

// License / activation state (device-local; validated against the Google Sheet)
let licenseState = { activated: false, key: '', plan: '', expiry: '', mode: '' };
try { let l = JSON.parse(localStorage.getItem('erpLicense')); if(l) licenseState = { ...licenseState, ...l }; } catch(e){}

function getDeviceId() {
    let id = localStorage.getItem('erpDeviceId');
    if (!id) { id = 'DEV-' + Math.random().toString(36).slice(2, 8).toUpperCase() + '-' + Date.now().toString(36).toUpperCase(); localStorage.setItem('erpDeviceId', id); }
    return id;
}

let currentInvoice = []; let editingInvIndex = -1; let nextInvoiceTracker = 1001;
let html5QrCode = null;          // BUGFIX: was referenced but never declared
let lastIndustry = null;         // BUGFIX: track industry so we don't wipe an in-progress bill on every settings save

if (billHistoryData.length > 0) {
    let maxNum = 1000;
    billHistoryData.forEach(b => {
        if (b && b.invoiceNo && typeof b.invoiceNo === 'string' && b.invoiceNo.includes('-')) {
            let parsed = parseInt(b.invoiceNo.split('-')[1]);
            if (!isNaN(parsed) && parsed > maxNum) maxNum = parsed;
        }
    });
    nextInvoiceTracker = maxNum + 1;
}

function getCurrInv() { return isolatedInventory[document.getElementById('industrySelector').value] || []; }

window.onload = function() {
    const today = new Date().toLocaleDateString('en-IN');
    document.getElementById('currentDate').innerText = today;
    document.getElementById('dashDate').innerText = today;
    document.getElementById('invoiceNumber').innerText = `INV-${nextInvoiceTracker}`;
    applySettingsToUI(); updateIndustry(); populateCustomerDatalist(); populateVendorDatalist(); setupBarcodeScannerListener();
    runAnalyticsEngine(); runAlertsEngine();   // BUGFIX: dashboard was blank until you navigated away & back
    registerServiceWorker();
    applyAiCloudSettingsToUI();
    applyExtraSettingsToUI();
    refreshLicenseUI();
    enforceActivation();
    handleDeepLink();
};

function enforceActivation() {
    const overlay = document.getElementById('activationOverlay');
    if (!overlay) return true;
    const expired = isLicenseExpired();
    if (licenseState.activated && !expired) { overlay.style.display = 'none'; return true; }
    if (expired) { licenseState.activated = false; localStorage.setItem('erpLicense', JSON.stringify(licenseState)); }
    overlay.style.display = 'flex';
    const dev = document.getElementById('actDeviceId'); if (dev) dev.innerText = getDeviceId();
    return false;
}

function isLicenseExpired() {
    if (!licenseState.expiry) return false;          // blank = lifetime
    const exp = new Date(licenseState.expiry + 'T23:59:59');
    return !isNaN(exp) && exp < new Date();
}

// Open a specific view if launched via a PWA shortcut (e.g. ?view=billing)
function handleDeepLink() {
    const view = new URLSearchParams(location.search).get('view');
    if (!view) return;
    const item = [...document.querySelectorAll('.menu-item')].find(m => (m.getAttribute('onclick') || '').includes(`'${view}'`));
    if (item) switchView(view, item);
}

// ==========================================
// PWA: SERVICE WORKER + INSTALL PROMPT
// ==========================================
function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('sw.js')
            .then(reg => console.log('✅ Service Worker registered', reg.scope))
            .catch(err => console.warn('SW registration failed', err));
    }
}

let deferredInstallPrompt = null;
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredInstallPrompt = e;
    const btn = document.getElementById('installAppBtn');
    if (btn) btn.style.display = 'inline-flex';
});

async function triggerInstall() {
    const btn = document.getElementById('installAppBtn');
    if (!deferredInstallPrompt) {
        alert("App is already installed, or your browser will show an install icon in the address bar.");
        return;
    }
    deferredInstallPrompt.prompt();
    const { outcome } = await deferredInstallPrompt.userChoice;
    if (outcome === 'accepted' && btn) btn.style.display = 'none';
    deferredInstallPrompt = null;
}

window.addEventListener('appinstalled', () => {
    const btn = document.getElementById('installAppBtn');
    if (btn) btn.style.display = 'none';
});

// ==========================================
// 2. DYNAMIC AI ENGINES (TESSERACT OCR)
// ==========================================

// AI Module A: Quick Stock Creation from Label Image
async function processAIImage() {
    const fileInput = document.getElementById('aiImageInput');
    if (!fileInput.files || fileInput.files.length === 0) return alert("Select an image first.");

    // Use Gemini Vision when chosen and a key is present (far more accurate than OCR).
    if (shopSettings.aiEngine === 'gemini' && shopSettings.geminiKey) {
        return geminiExtractProduct(fileInput.files[0]);
    }

    const statusLabel = document.getElementById('aiLoadingStatus');
    statusLabel.style.display = 'inline-block';
    
    try {
        const result = await Tesseract.recognize(fileInput.files[0], 'eng');
        const text = result.data.text;
        
        let priceMatch = text.match(/(?:mrp|rs\.?|₹|price)\s*[:\-]?\s*([\d,]+\.?\d*)/i);
        if (priceMatch) {
            let cleanPrice = priceMatch[1].replace(/,/g, '');
            document.getElementById('aiInvPrice').value = cleanPrice;
            document.getElementById('aiInvCost').value = (parseFloat(cleanPrice) * 0.8).toFixed(2);
        }
        let expMatch = text.match(/(?:exp|use before|best before|expiry)\s*[:\-]?\s*([\d\/\.\-]+|[A-Za-z]+\s*\d{4})/i);
        if (expMatch) document.getElementById('aiInvExpiry').value = expMatch[1].substring(0, 15).trim();
        let batchMatch = text.match(/(?:batch|b\.no|lot)\s*[:\-]?\s*([A-Za-z0-9\-]+)/i);
        if (batchMatch) document.getElementById('aiInvBatch').value = batchMatch[1].trim();

        const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 3);
        if (lines.length > 0) {
            let bestName = lines.find(l => /[A-Za-z]{4,}/.test(l) && !l.toLowerCase().includes('mrp'));
            if(bestName) document.getElementById('aiInvName').value = bestName.replace(/[^a-zA-Z0-9\s]/g, '').substring(0, 40).trim();
        }
        alert("✅ AI Extraction Done! Please review parameters before submitting.");
    } catch (err) { alert("AI core misread the lines. Ensure snapshot contrast is clean."); }
    finally { statusLabel.style.display = 'none'; fileInput.value = ''; }
}

function saveAIInventoryItem() {
    const ind = document.getElementById('industrySelector').value; const currentInv = getCurrInv();
    const name = document.getElementById('aiInvName').value; const batch = document.getElementById('aiInvBatch').value;
    const qty = parseInt(document.getElementById('aiInvQty').value) || 0; const cost = parseFloat(document.getElementById('aiInvCost').value) || 0; const price = parseFloat(document.getElementById('aiInvPrice').value) || 0;
    const expiry = document.getElementById('aiInvExpiry').value;
    
    if(!name) return alert("Please enter an Item Name.");
    
    const itemObj = { name, batch, qty, cost, price, hsn: '', gst: '18', weight: '', purity: '', making: '', expiry };
    currentInv.push(itemObj); 
    
    ['aiInvName','aiInvBatch','aiInvQty','aiInvCost','aiInvPrice','aiInvExpiry'].forEach(id => { if(document.getElementById(id)) document.getElementById(id).value = ''; });
    
    localStorage.setItem('myBusinessInventory', JSON.stringify(isolatedInventory));
    alert("Added to Stock via AI!");
}


// AI Module B: Multi-Item Purchase Invoice Scanner
window.aiDraftItems = []; 
let currentGlobalVendor = "";
let currentGlobalBill = "";

async function processPurchaseInvoice() {
    const fileInput = document.getElementById('aiInvoiceInput');
    if (!fileInput.files || fileInput.files.length === 0) return alert("Select invoice file snapshot.");

    // Use Gemini Vision when chosen and a key is present.
    if (shopSettings.aiEngine === 'gemini' && shopSettings.geminiKey) {
        return geminiProcessPurchaseInvoice(fileInput.files[0]);
    }

    const statusLabel = document.getElementById('aiInvoiceLoading');
    statusLabel.style.display = 'inline-block';

    try {
        const result = await Tesseract.recognize(fileInput.files[0], 'eng');
        const text = result.data.text;
        
        // 1. Global Extract
        let invMatch = text.match(/(?:INV|INVOICE|BILL)\s*(?:NO|#)?[\s\:\-\.]*([A-Z0-9\-\/]+)/i);
        if (invMatch) currentGlobalBill = invMatch[1].trim();
        
        let globalGst = 18; // Default
        let gstMatch = text.match(/(?:GST|IGST|CGST)[\s\:\-\@]*(\d{1,2})(?:\.\d+)?\s*%/i);
        if (gstMatch) {
            globalGst = parseInt(gstMatch[1]);
            if(text.match(/CGST/i)) globalGst *= 2; 
        }

        const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 4);
        if (lines.length > 0 && !lines[0].toLowerCase().includes('tax invoice')) {
            currentGlobalVendor = lines[0].replace(/[^a-zA-Z0-9\s\.\&]/g, '').substring(0, 40).trim();
        }

        // 2. Tabular Line-Item Extraction (Variable GST & Multi-IMEI)
        window.aiDraftItems = [];
        lines.forEach(line => {
            let cleanLine = line.trim();
            if(cleanLine.length < 10) return; 
            if(cleanLine.match(/total|gst|tax|amount|invoice|bill|bank|ifsc|discount/i)) return; 

            // Hunt for specific GST on this line (Overrides global)
            let lineGst = globalGst;
            let lineGstMatch = cleanLine.match(/\b(\d{1,2})(?:\.\d+)?\s*%/);
            if(lineGstMatch) lineGst = parseInt(lineGstMatch[1]);

            // Hunt for IMEIs / Serials (Multiple 15 digit strings)
            let serials = cleanLine.match(/\b\d{14,16}\b/g) || cleanLine.match(/\b[A-Z0-9]{10,15}\b/g) || [];
            let serialString = serials.join(', ');

            let numMatches = cleanLine.match(/\b\d+(?:[\.,]\d{2})?\b/g);
            if(numMatches && numMatches.length >= 2) {
                let name = cleanLine.replace(/[0-9\.\,\%]/g, '').trim().replace(/^[^a-zA-Z]+|[^a-zA-Z]+$/g, '').substring(0, 45);
                if(name.length < 4) return; 

                let rate = 0; let qty = 1; let hsn = '';
                
                let decimals = numMatches.filter(n => n.includes('.') || n.includes(','));
                let ints = numMatches.filter(n => !n.includes('.') && !n.includes(','));

                if(decimals.length > 0) { rate = parseFloat(decimals[0].replace(',', '')); } 
                else { let sortedNums = [...numMatches].map(n => parseInt(n)).sort((a,b) => b-a); rate = sortedNums[0]; }

                if(ints.length > 0) {
                    let smallInts = ints.filter(n => parseInt(n) < 1000);
                    if(smallInts.length > 0) qty = parseInt(smallInts[0]);
                    let hsnCands = ints.filter(n => n.length >= 4 && n.length <= 8);
                    if(hsnCands.length > 0) hsn = hsnCands[0];
                }

                if(rate > 0) { 
                    window.aiDraftItems.push({ name, hsn, serials: serialString, qty, rate, gst: lineGst, originalLine: cleanLine }); 
                }
            }
        });

        if(window.aiDraftItems.length > 0) renderAiDraftQueue();
        alert("✅ AI Table Parser complete! Found " + window.aiDraftItems.length + " individual items.\nPlease load them from the queue.");
    } catch (e) { alert("Parser crashed due to low resolution."); }
    finally { statusLabel.style.display = 'none'; fileInput.value = ''; }
}

function renderAiDraftQueue() {
    const container = document.getElementById('aiScannedItemsContainer');
    const tbody = document.getElementById('aiScannedItemsBody');
    const form = document.getElementById('aiPurchaseStagingForm');
    tbody.innerHTML = '';
    
    if(window.aiDraftItems.length === 0) { 
        container.style.display = 'none'; 
        form.style.opacity = '0.5'; form.style.pointerEvents = 'none';
        return; 
    }

    form.style.opacity = '1'; form.style.pointerEvents = 'all';

    window.aiDraftItems.forEach((item, index) => {
        let serBadge = item.serials ? `<br><small style="color:var(--primary);">SN: ${item.serials}</small>` : '';
        tbody.innerHTML += `<tr>
            <td><strong>${item.name}</strong></td>
            <td>${item.serials ? '✓ Found' : '-'}</td>
            <td>${item.hsn}</td><td>${item.gst}%</td><td>${item.qty}</td><td>₹${item.rate}</td>
            <td><button type="button" class="btn-success" style="padding: 4px 10px; height: auto;" onclick="loadAiDraftItem(${index})">Load ⬇️</button></td>
        </tr>`;
    });
    container.style.display = 'flex';
}

function loadAiDraftItem(index) {
    const item = window.aiDraftItems[index];
    
    document.getElementById('aiPurVendor').value = currentGlobalVendor;
    document.getElementById('aiPurBillNo').value = currentGlobalBill;
    
    document.getElementById('aiPurItem').value = item.name;
    document.getElementById('aiPurBatch').value = item.serials;
    if(document.getElementById('aiPurHsn')) document.getElementById('aiPurHsn').value = item.hsn;
    if(document.getElementById('aiPurGst')) document.getElementById('aiPurGst').value = item.gst;
    document.getElementById('aiPurQty').value = item.qty;
    document.getElementById('aiPurCost').value = item.rate;
    document.getElementById('aiPurTotal').value = (item.qty * item.rate).toFixed(2);
    
    window.aiDraftItems.splice(index, 1);
    renderAiDraftQueue();
    
    const box = document.getElementById('aiPurchaseStagingForm');
    box.style.boxShadow = "0 0 15px var(--success)";
    setTimeout(() => box.style.boxShadow = "none", 800);
}

function saveAIPurchaseEntry() {
    const ind = document.getElementById('industrySelector').value; const currentInv = getCurrInv();
    const vendor = document.getElementById('aiPurVendor').value; const item = document.getElementById('aiPurItem').value;
    const qty = parseInt(document.getElementById('aiPurQty').value) || 0; const cost = parseFloat(document.getElementById('aiPurCost').value) || 0;
    const total = parseFloat(document.getElementById('aiPurTotal').value) || (qty * cost); const paid = parseFloat(document.getElementById('aiPurPaid').value) || 0;
    
    const batch = document.getElementById('aiPurBatch').value;
    const hsn = document.getElementById('aiPurHsn').value; const gst = document.getElementById('aiPurGst').value;

    if(!vendor || !item || qty <= 0) return alert("Please fill Vendor, Item, and Qty correctly.");
    
    let found = currentInv.find(i => i.name.toLowerCase() === item.toLowerCase());
    if (found) { 
        found.qty += qty; found.cost = cost; 
        if(batch) found.batch = batch; if(hsn) found.hsn = hsn; if(gst) found.gst = gst;
    } else { currentInv.push({ name: item, batch, hsn, gst, qty, cost, price: cost*1.2 }); }

    if (!vendorLedgerData[vendor]) vendorLedgerData[vendor] = { billed: 0, paid: 0 };
    vendorLedgerData[vendor].billed += total; vendorLedgerData[vendor].paid += paid;

    const aiPurchaseRec = { industry: ind, date: new Date().toLocaleDateString('en-IN'), vendor, billNo: document.getElementById('aiPurBillNo').value, item, qty, cost, total, paid, status: (total - paid) > 0 ? 'Credit' : 'Paid' };
    purchaseHistoryData.push(aiPurchaseRec);

    localStorage.setItem('myBusinessInventory', JSON.stringify(isolatedInventory));
    localStorage.setItem('myVendorLedger', JSON.stringify(vendorLedgerData));
    localStorage.setItem('myBusinessPurchases', JSON.stringify(purchaseHistoryData));

    pushPurchaseToCloud(aiPurchaseRec);

    ['aiPurVendor','aiPurBillNo','aiPurItem','aiPurBatch','aiPurHsn','aiPurGst','aiPurQty','aiPurCost','aiPurTotal','aiPurPaid'].forEach(id => document.getElementById(id).value='');
    renderPurchaseHistory(); renderSupplierLedger(); renderInventoryTable(); renderStockStatement(); runAlertsEngine();
    alert("AI Purchase Item Logged successfully!");
}

// ==========================================
// 3. UI, MATH & PRINT HELPERS
// ==========================================
function numberToWords(num) {
    if(num === 0) return 'Zero';
    const a = ['','One ','Two ','Three ','Four ', 'Five ','Six ','Seven ','Eight ','Nine ','Ten ','Eleven ','Twelve ','Thirteen ','Fourteen ','Fifteen ','Sixteen ','Seventeen ','Eighteen ','Nineteen '];
    const b = ['', '', 'Twenty','Thirty','Forty','Fifty', 'Sixty','Seventy','Eighty','Ninety'];
    if ((num = num.toString()).length > 9) return 'Overflow';
    let n = ('000000000' + num).substr(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
    if (!n) return; let str = '';
    str += (n[1] != 0) ? (a[Number(n[1])] || b[n[1][0]] + ' ' + a[n[1][1]]) + 'Crore ' : '';
    str += (n[2] != 0) ? (a[Number(n[2])] || b[n[2][0]] + ' ' + a[n[2][1]]) + 'Lakh ' : '';
    str += (n[3] != 0) ? (a[Number(n[3])] || b[n[3][0]] + ' ' + a[n[3][1]]) + 'Thousand ' : '';
    str += (n[4] != 0) ? (a[Number(n[4])] || b[n[4][0]] + ' ' + a[n[4][1]]) + 'Hundred ' : '';
    str += (n[5] != 0) ? ((str != '') ? 'and ' : '') + (a[Number(n[5])] || b[n[5][0]] + ' ' + a[n[5][1]]) : '';
    return str.trim();
}

function calcNetWt() {
    const gross = parseFloat(document.getElementById('billGrossWt').value) || 0;
    const stone = parseFloat(document.getElementById('billStoneWt').value) || 0;
    document.getElementById('billNetWt').value = (gross - stone).toFixed(3);
}

function parseIndDate(dateStr) {
    if(!dateStr) return new Date(0);
    const parts = dateStr.split('/');
    if(parts.length === 3) return new Date(`${parts[2]}-${parts[1]}-${parts[0]}T00:00:00`);
    return new Date(dateStr); 
}

function updatePrintDOM() {
    const ind = document.getElementById('industrySelector').value;
    const cName = document.getElementById('customerName').value || 'Cash Customer';
    const cPhone = document.getElementById('customerPhone').value || '-';
    const cAddr = document.getElementById('customerAddress').value || '-';
    const cGst = document.getElementById('customerGstin').value || '-';
    const doctor = document.getElementById('doctorName') ? document.getElementById('doctorName').value : '';
    const invNum = document.getElementById('invoiceNumber').innerText;
    const invDate = document.getElementById('currentDate').innerText;
    
    const paidNow = parseFloat(document.getElementById('billAmountPaid').value) || 0;
    const oldGold = parseFloat(document.getElementById('billOldGold') ? document.getElementById('billOldGold').value : 0) || 0;
    const gTotal = parseFloat(document.getElementById('grandTotal').innerText) || 0;
    const payModeStr = (paidNow > 0 || oldGold > 0) ? "CASH/UPI" : "CREDIT";
    const amtWords = `Rupees ${numberToWords(Math.round(gTotal))} Only`;

    document.getElementById('pTopGst').innerText = shopSettings.gst || '-';
    document.getElementById('pShopTitle').innerText = shopSettings.shopName || 'Shop Name';
    document.getElementById('pShopAddr').innerText = shopSettings.address || '-';
    document.getElementById('pShopPhone').innerText = shopSettings.phone || '-';

    if (ind !== 'Jewelry') {
        document.getElementById('pCustNameS').innerText = cName;
        document.getElementById('pCustAddressS').innerText = cAddr + '\nMob: ' + cPhone;
        document.getElementById('pCustGstS').innerText = cGst;
        document.getElementById('pInvNumS').innerText = invNum;
        document.getElementById('pInvDateS').innerText = invDate;
        document.getElementById('pPayModeS').innerText = payModeStr;
        if(document.getElementById('pDoctorP')) document.getElementById('pDoctorP').innerText = doctor;
        
        document.getElementById('pBankNameS').innerText = shopSettings.bankName || '-';
        document.getElementById('pBankAccS').innerText = shopSettings.bankAcc || '-';
        document.getElementById('pBankIfscS').innerText = shopSettings.bankIfsc || '-';
        document.getElementById('pAmountWordsS').innerText = amtWords;
        
        document.getElementById('pTaxableS').innerText = document.getElementById('subtotal').innerText;
        document.getElementById('pCgstS').innerText = (parseFloat(document.getElementById('totalGst').innerText) / 2).toFixed(2);
        document.getElementById('pSgstS').innerText = (parseFloat(document.getElementById('totalGst').innerText) / 2).toFixed(2);
        document.getElementById('pGrandS').innerText = gTotal.toFixed(2);
    } else {
        document.getElementById('pCustNameJ').innerText = cName;
        document.getElementById('pCustAddressJ').innerText = cAddr;
        document.getElementById('pCustPhoneJ').innerText = cPhone;
        document.getElementById('pCustGstJ').innerText = cGst;
        document.getElementById('pInvNumJ').innerText = invNum;
        document.getElementById('pInvDateJ').innerText = invDate;
        document.getElementById('pAmountWordsJ').innerText = amtWords;
        document.getElementById('pBankNameJ').innerText = shopSettings.bankName || '-';
        document.getElementById('pBankAccJ').innerText = shopSettings.bankAcc || '-';
        document.getElementById('pBankIfscJ').innerText = shopSettings.bankIfsc || '-';
        document.getElementById('pPayDateJ').innerText = invDate;
        document.getElementById('pOldGoldJ').innerText = oldGold.toFixed(2);
        document.getElementById('pPaidJ').innerText = paidNow.toFixed(2);
        
        let mcTot=0; currentInvoice.forEach(i => mcTot += i.making);
        let subTot = parseFloat(document.getElementById('subtotal').innerText);
        document.getElementById('pSubTotalJ').innerText = (subTot - mcTot).toFixed(2); 
        document.getElementById('pDiscJ').innerText = "0.00";
        document.getElementById('pMcJ').innerText = mcTot.toFixed(2);
        document.getElementById('pHallmarkJ').innerText = parseFloat(document.getElementById('billOtherCharge').value || 0).toFixed(2);
        document.getElementById('pTaxableTotalJ').innerText = subTot.toFixed(2); 
        
        let gst = parseFloat(document.getElementById('totalGst').innerText);
        document.getElementById('pCgstJ').innerText = (gst/2).toFixed(2);
        document.getElementById('pSgstJ').innerText = (gst/2).toFixed(2);
        document.getElementById('pGrandJ').innerText = gTotal.toFixed(2);
        document.getElementById('pTotalPaidJ').innerText = (paidNow + oldGold).toFixed(2);
        document.getElementById('pBalanceJ').innerText = document.getElementById('billBalanceDue').innerText;
    }
}

window.addEventListener('beforeprint', updatePrintDOM);
window.addEventListener('beforeprint', renderInvoiceQR);

function switchView(viewId, element) {
    document.querySelectorAll('.view-section').forEach(v => v.classList.remove('active-view'));
    document.querySelectorAll('.menu-item').forEach(m => m.classList.remove('active'));
    document.getElementById(viewId).classList.add('active-view');
    if(element) element.classList.add('active');
    
    if(viewId === 'stockStatement') renderStockStatement();
    if(viewId === 'billHistory') renderBillHistory();
    if(viewId === 'supplierLedger') renderSupplierLedger();   // BUGFIX: was never rendered on open
    if(viewId === 'purchases') renderPurchaseHistory();        // BUGFIX: was never rendered on open
    if(viewId === 'inventory') { document.getElementById('invSearchBox').value = ''; renderInventoryTable(); }
    if(viewId === 'customerLedger') renderCustomerLedger();
    if(viewId === 'dashboard') { runAlertsEngine(); runAnalyticsEngine(); }
    syncBottomNav(viewId);
    updateCheckoutFab();
}

function syncBottomNav(viewId) {
    document.querySelectorAll('.bn-item').forEach(b => b.classList.toggle('active', b.getAttribute('data-view') === viewId));
}

function navFromBottom(viewId, el) {
    const sideItem = [...document.querySelectorAll('.menu-item')].find(m => (m.getAttribute('onclick') || '').includes(`'${viewId}'`));
    switchView(viewId, sideItem || null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function toggleSetup() {
    const wrap = document.getElementById('setupDropdownWrap');
    wrap.style.display = wrap.style.display === 'none' ? 'block' : 'none';
}

function updateIndustry() {
    const ind = document.getElementById('industrySelector').value;
    const format = shopSettings.printFormat === 'thermal' ? 'print-thermal' : 'print-a4';
    document.body.className = `industry-${ind.toLowerCase()} ${format}`; 
    document.getElementById('billTitle').innerText = `${ind} Tax Invoice`;
    
    let root = document.documentElement;
    if (ind === 'Electronics') { root.style.setProperty('--primary', '#0284c7'); root.style.setProperty('--primary-hover', '#0369a1'); } 
    else if (ind === 'Jewelry') { root.style.setProperty('--primary', '#b91c1c'); root.style.setProperty('--primary-hover', '#9f1239'); } 
    else if (ind === 'Pharmacy') { root.style.setProperty('--primary', '#059669'); root.style.setProperty('--primary-hover', '#047857'); } 
    else if (ind === 'Grocery') { root.style.setProperty('--primary', '#ea580c'); root.style.setProperty('--primary-hover', '#c2410c'); }
    
    let tableHeaders = ''; let invHeaders = `<th>Item Name</th><th>Batch/SKU</th>`;
    if (ind === 'Jewelry') {
        tableHeaders = `<th>SL</th><th>Description</th><th>HSCODE</th><th>HUID</th><th>Rate</th><th>G.W</th><th>STON</th><th>OLD G.</th><th>Weight</th><th>Amount</th><th>MC (₹)</th><th>OT.CH</th><th>TAXABLE</th><th>CGST</th><th>SGST</th><th>PRICE</th><th class="no-print" style="width:30px;">X</th>`;
        invHeaders += `<th>Weight(g)</th><th>Purity</th><th>Cost(₹)</th><th>Price(₹)</th><th>Stock</th><th style="width: 120px;">Action</th>`;
    } else if (ind === 'Pharmacy') {
        tableHeaders = `<th>SN</th><th>PRODUCT DESCRIPTION</th><th>BATCH/EXP</th><th>Qty.</th><th>Rate</th><th>Taxable</th><th colspan="2" style="padding:0; border:none;"><table style="width:100%; border:none; margin:0;"><tr style="border-bottom:1px solid #000;"><th colspan="2" style="border:none; text-align:center;">GST</th></tr><tr><th style="border:none; border-right:1px solid #000; width:50%; text-align:center;">%</th><th style="border:none; text-align:center;">Amt.</th></tr></table></th><th>Total</th><th class="no-print" style="width:30px;">X</th>`;
        invHeaders += `<th>Expiry</th><th>GST%</th><th>Cost(₹)</th><th>Retail(₹)</th><th>Stock</th><th style="width: 120px;">Action</th>`;
    } else {
        tableHeaders = `<th>SN</th><th>PRODUCT DESCRIPTION</th><th>HSN</th><th>Qty.</th><th>Rate</th><th>Taxable</th><th colspan="2" style="padding:0; border:none;"><table style="width:100%; border:none; margin:0;"><tr style="border-bottom:1px solid #000;"><th colspan="2" style="border:none; text-align:center;">GST</th></tr><tr><th style="border:none; border-right:1px solid #000; width:50%; text-align:center;">%</th><th style="border:none; text-align:center;">Amt.</th></tr></table></th><th>Total</th><th class="no-print" style="width:30px;">X</th>`;
        invHeaders += `<th>HSN</th><th>GST%</th><th>Cost(₹)</th><th>Retail(₹)</th><th>Stock</th><th style="width: 120px;">Action</th>`;
        if(ind === 'Electronics') generateImeiBoxes();
    }

    document.getElementById('invoiceHead').innerHTML = `<tr>${tableHeaders}</tr>`;
    document.getElementById('invHead').innerHTML = `<tr>${invHeaders}</tr>`;
    
    // BUGFIX: previously wiped the cart on EVERY call (e.g. saving settings mid-bill).
    // Only reset when the industry genuinely changed.
    if (lastIndustry !== null && lastIndustry !== ind && currentInvoice.length > 0) {
        currentInvoice = []; clearBillingInputs();
    }
    lastIndustry = ind;
    renderInvoiceTable(); renderInventoryTable();
}

function togglePrintFormat() { shopSettings.printFormat = document.getElementById('setPrintFormat').value; updateIndustry(); }

function previewAndSaveLogo(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = e => {
            shopSettings.logoData = e.target.result;
            localStorage.setItem('myBusinessSettings', JSON.stringify(shopSettings));
            applySettingsToUI();
        }; reader.readAsDataURL(file);
    }
}

function applySettingsToUI() {
    ['ShopName','Address','Phone','Gst','Terms','BankName','BankAcc','BankIfsc','PrintFormat','License'].forEach(key => {
        const el = document.getElementById('set' + key);
        if(el && shopSettings[key.charAt(0).toLowerCase() + key.slice(1)]) el.value = shopSettings[key.charAt(0).toLowerCase() + key.slice(1)];
    });
    
    document.getElementById('displayShopName').innerText = shopSettings.shopName || 'Shop Name';
    document.getElementById('displayAddress').innerText = shopSettings.address;
    document.getElementById('displayContact').innerHTML = shopSettings.phone ? `Ph: ${shopSettings.phone}` : '';
    document.getElementById('displayGst').innerHTML = shopSettings.gst ? `GSTIN: ${shopSettings.gst}` : '';
    document.getElementById('displayTerms').innerText = shopSettings.terms;
    
    if (shopSettings.logoData) {
        if(document.getElementById('settingsLogoPreview')) { document.getElementById('settingsLogoPreview').src = shopSettings.logoData; document.getElementById('settingsLogoPreview').style.display = 'block'; }
        if(document.getElementById('displayLogo')) { document.getElementById('displayLogo').src = shopSettings.logoData; document.getElementById('displayLogo').style.display = 'block'; }
        if(document.getElementById('pDisplayLogo')) { document.getElementById('pDisplayLogo').src = shopSettings.logoData; document.getElementById('pDisplayLogo').style.display = 'block'; }
    }
}

function saveSettings() {
    ['ShopName','Address','Phone','Gst','Terms','BankName','BankAcc','BankIfsc','PrintFormat','License'].forEach(key => {
        const el = document.getElementById('set' + key);
        if(el) shopSettings[key.charAt(0).toLowerCase() + key.slice(1)] = el.value;
    });
    localStorage.setItem('myBusinessSettings', JSON.stringify(shopSettings));
    applySettingsToUI(); updateIndustry(); alert("Settings saved successfully!");
}

// ==========================================
// 4. POS CAMERA SCANNER ENGINE
// ==========================================
function startCameraScanner() {
    const readerDiv = document.getElementById('qr-reader');
    // 1) Library not loaded (first run with no internet, or the CDN is blocked)
    if (typeof Html5Qrcode === 'undefined') {
        alert("The camera-scanner library hasn't loaded yet.\n\nGo online once so it can cache for offline use, then reopen the app.");
        return;
    }
    // 2) Camera requires a secure context — file:// and plain http:// are blocked by the browser
    const host = location.hostname;
    if (!window.isSecureContext && host !== 'localhost' && host !== '127.0.0.1') {
        alert("📷 The camera only works over HTTPS (or localhost).\n\nYou're on \"" + (location.protocol || '') + "//" + host + "\".\nHost the app on HTTPS — e.g. Netlify, Vercel, GitHub Pages or Firebase Hosting — or install it as an app, then the scanner will open.");
        return;
    }
    readerDiv.style.display = 'block';
    document.getElementById('startScannerBtn').style.display = 'none';
    document.getElementById('stopScannerBtn').style.display = 'inline-flex';
    try {
        if (!html5QrCode) { html5QrCode = new Html5Qrcode("qr-reader"); }
        html5QrCode.start({ facingMode: "environment" }, { fps: 10, qrbox: { width: 250, height: 150 } },
            (decodedText) => { stopCameraScanner(); processScannedBarcode(decodedText); },
            () => { }
        ).catch((err) => {
            alert("Couldn't start the camera: " + (err && err.message ? err.message : err) + "\n\nAllow camera permission for this site, and close any other app/tab using the camera.");
            resetScannerUI();
        });
    } catch (e) { alert("Scanner error: " + e.message); resetScannerUI(); }
}
function resetScannerUI() {
    const r = document.getElementById('qr-reader'); if (r) r.style.display = 'none';
    const s = document.getElementById('startScannerBtn'); if (s) s.style.display = 'inline-flex';
    const x = document.getElementById('stopScannerBtn'); if (x) x.style.display = 'none';
}
function stopCameraScanner() {
    if (html5QrCode) {
        html5QrCode.stop().then(resetScannerUI).catch(err => { console.log(err); resetScannerUI(); });
    } else { resetScannerUI(); }
}

let barcodeBuffer = ''; let barcodeTimer;
function setupBarcodeScannerListener() {
    document.addEventListener('keypress', function(e) {
        if (!document.getElementById('billing').classList.contains('active-view')) return;
        if (e.target.tagName === 'INPUT' && e.target.id !== 'billItemName' && e.target.id !== 'billHsn') return;
        if (e.key === 'Enter') {
            if (barcodeBuffer.length > 2) processScannedBarcode(barcodeBuffer);
            barcodeBuffer = ''; clearTimeout(barcodeTimer);
        } else { barcodeBuffer += e.key; clearTimeout(barcodeTimer); barcodeTimer = setTimeout(() => { barcodeBuffer = ''; }, 100); }
    });
}

function processScannedBarcode(code) {
    const found = getCurrInv().find(i => i.hsn === code || i.batch === code);
    if (found) { document.getElementById('billItemName').value = found.name; autoFillBilling(); addInvoiceItem(); } 
    else { alert(`Code ${code} not found in inventory.`); }
}

// ==========================================
// 5. BILLING MATH ENGINE
// ==========================================
function autoFillCustomer() {
    const name = document.getElementById('customerName').value.trim();
    if(!name) return;
    for(let i = billHistoryData.length - 1; i >= 0; i--) {
        if(billHistoryData[i].customer.toLowerCase() === name.toLowerCase()) {
            if(billHistoryData[i].phone) document.getElementById('customerPhone').value = billHistoryData[i].phone;
            if(billHistoryData[i].address) document.getElementById('customerAddress').value = billHistoryData[i].address;
            if(billHistoryData[i].gstin) document.getElementById('customerGstin').value = billHistoryData[i].gstin;
            break;
        }
    }
}

function generateImeiBoxes() {
    const ind = document.getElementById('industrySelector').value;
    if(ind !== 'Electronics') return; 
    let qty = parseInt(document.getElementById('billQty').value) || 1;
    if(qty > 50) qty = 50; if(qty < 1) qty = 1;
    const container = document.getElementById('imeiContainer'); if(!container) return;
    const existingInputs = container.querySelectorAll('.imei-input');
    let vals = []; existingInputs.forEach(inp => vals.push(inp.value));
    container.innerHTML = ''; 
    for(let i = 0; i < qty; i++) {
        let val = vals[i] || ''; container.innerHTML += `<input type="text" class="imei-input" placeholder="IMEI / Serial ${i+1}" value="${val}">`;
    }
}

function autoFillBilling() {
    const ind = document.getElementById('industrySelector').value;
    const name = document.getElementById('billItemName').value.toLowerCase();
    if (ind === 'Jewelry') {
        if (name.includes('gold')) document.getElementById('billRate').value = document.getElementById('globalGoldRate').value;
        if (name.includes('silver')) document.getElementById('billRate').value = document.getElementById('globalSilverRate').value;
    } else {
        const found = getCurrInv().find(i => i.name.toLowerCase() === name);
        if(found) {
            document.getElementById('billRate').value = found.price || 0;
            if(document.getElementById('billHsn') && found.hsn) document.getElementById('billHsn').value = found.hsn;
            if(document.getElementById('billGst') && found.gst) document.getElementById('billGst').value = found.gst;
            if(document.getElementById('billBatch') && found.batch) document.getElementById('billBatch').value = found.batch;
        }
    }
}

function autoFillByHsn() {
    const typedHsn = document.getElementById('billHsn').value; if(!typedHsn) return;
    const found = getCurrInv().find(i => i.hsn === typedHsn);
    if(found) { document.getElementById('billItemName').value = found.name; autoFillBilling(); }
}

function addInvoiceItem() {
    const ind = document.getElementById('industrySelector').value;
    const name = document.getElementById('billItemName').value;
    if (!name) return alert("Enter item name");
    
    let qty = 1, rate = 0, gstRate = parseFloat(document.getElementById('billGst').value) || 0;
    let rawDiscVal = parseFloat(document.getElementById('billItemDisc') ? document.getElementById('billItemDisc').value : 0) || 0;
    let rawDiscType = document.getElementById('billDiscType') ? document.getElementById('billDiscType').value : '₹';
    let itemDiscount = 0;

    let taxableValue = 0, gstAmount = 0, total = 0;
    let huid='', purity='', grossWt=0, stoneWt=0, netWt=0;
    let rawMakingVal = 0, rawMakingType = '₹', making = 0;
    let dyn1 = '', dyn2 = '', dyn3 = '';

    if (ind === 'Jewelry') {
        qty = parseFloat(document.getElementById('billQty') ? document.getElementById('billQty').value : 1) || 1;
        huid = document.getElementById('billHuid').value; purity = document.getElementById('billPurity').value;
        grossWt = parseFloat(document.getElementById('billGrossWt').value) || 0;
        stoneWt = parseFloat(document.getElementById('billStoneWt').value) || 0;
        netWt = parseFloat(document.getElementById('billNetWt').value) || 0;
        rate = parseFloat(document.getElementById('billRate').value) || 0;
        
        rawMakingVal = parseFloat(document.getElementById('billMaking').value) || 0;
        rawMakingType = document.getElementById('billMakingType').value;
        making = rawMakingType === '%' ? (netWt * rate) * (rawMakingVal / 100) : rawMakingVal;
        taxableValue = (netWt * rate) + making; total = taxableValue; 
    } else {
        qty = parseFloat(document.getElementById('billQty').value) || 1;
        rate = parseFloat(document.getElementById('billRate').value) || 0;
        itemDiscount = rawDiscType === '%' ? (qty * rate) * (rawDiscVal / 100) : rawDiscVal;
        
        taxableValue = (qty * rate) - itemDiscount;
        gstAmount = taxableValue * (gstRate / 100); 
        total = taxableValue + gstAmount;
    }
    
    const foundInv = getCurrInv().find(i => i.name === name);
    const cost = foundInv ? (parseFloat(foundInv.cost) || 0) : 0;
    const totalCost = cost * (ind === 'Jewelry' ? netWt : qty);

    if (ind === 'Electronics') { 
        let serials = []; document.querySelectorAll('.imei-input').forEach(inp => { if(inp.value.trim()) serials.push(inp.value.trim()); });
        dyn1 = serials.join(', '); dyn3 = document.getElementById('billHsn') ? document.getElementById('billHsn').value : '';
    } else if (ind === 'Pharmacy') {
        dyn1 = document.getElementById('billBatch').value; dyn2 = document.getElementById('billExpiry').value;
    } else if (ind === 'Grocery') {
        dyn3 = document.getElementById('billHsn') ? document.getElementById('billHsn').value : '';
    }
    
    currentInvoice.push({ 
        name, qty, rate, rawDiscVal, rawDiscType, discount: itemDiscount, rawMakingVal, rawMakingType, making, 
        taxableValue, gstRate, gstAmount, total, huid, purity, grossWt, stoneWt, netWt, cost: totalCost, dyn1, dyn2, dyn3 
    });
    
    renderInvoiceTable(); clearBillingInputs(); document.getElementById('billItemName').focus();
}

function clearBillingInputs() {
    ['billItemName','billHuid','billPurity','billGrossWt','billStoneWt','billNetWt','billMaking','billQty','billRate','billItemDisc','billSerial','billHsn','billBatch','billExpiry'].forEach(id => {
        const el = document.getElementById(id); if(el) el.value = (id==='billQty') ? '1' : '';
    });
    const imeiContainer = document.getElementById('imeiContainer');
    if(imeiContainer) { imeiContainer.innerHTML = '<input type="text" class="imei-input" placeholder="IMEI / Serial 1">'; }
}

function editInvoiceItem(index) {
    const ind = document.getElementById('industrySelector').value; const item = currentInvoice[index];
    document.getElementById('billItemName').value = item.name;
    if(document.getElementById('billQty')) document.getElementById('billQty').value = item.qty;
    if(document.getElementById('billRate')) document.getElementById('billRate').value = item.rate;
    if(document.getElementById('billItemDisc')) { document.getElementById('billItemDisc').value = item.rawDiscVal || ''; document.getElementById('billDiscType').value = item.rawDiscType || '₹'; }
    if(document.getElementById('billGst')) document.getElementById('billGst').value = item.gstRate;

    if (ind === 'Electronics') { 
        generateImeiBoxes(); let serials = (item.dyn1 || '').split(', '); let inputs = document.querySelectorAll('.imei-input');
        inputs.forEach((inp, idx) => { if(serials[idx]) inp.value = serials[idx].trim(); });
        if(document.getElementById('billHsn')) document.getElementById('billHsn').value = item.dyn3 || ''; 
    } else if (ind === 'Pharmacy') {
        document.getElementById('billBatch').value = item.dyn1 || ''; document.getElementById('billExpiry').value = item.dyn2 || '';
    } else if (ind === 'Jewelry') { 
        document.getElementById('billPurity').value = item.purity || ''; document.getElementById('billHuid').value = item.huid || ''; 
        if(document.getElementById('billMaking')) { document.getElementById('billMaking').value = item.rawMakingVal || ''; document.getElementById('billMakingType').value = item.rawMakingType || '₹'; }
    }
    currentInvoice.splice(index, 1); renderInvoiceTable();
}

function renderInvoiceTable() {
    const ind = document.getElementById('industrySelector').value;
    const tbody = document.getElementById('invoiceBody');
    tbody.innerHTML = ''; let subtotal = 0, totalGst = 0, totalQty = 0;

    currentInvoice.forEach((item, index) => {
        let rowHtml = `<td style="text-align:center;">${index + 1}</td>`;
        
        if (ind === 'Jewelry') {
            subtotal += item.taxableValue; 
            let cgst = (item.taxableValue * 0.015).toFixed(2); let sgst = (item.taxableValue * 0.015).toFixed(2);
            rowHtml += `
                <td>${item.name}</td><td>${item.dyn3 || '7108'}</td><td>${item.huid}</td><td>${item.rate.toFixed(2)}</td>
                <td>${item.grossWt.toFixed(3)}</td><td>${item.stoneWt.toFixed(3)}</td><td>0.000</td><td>${item.netWt.toFixed(3)}</td>
                <td>${(item.netWt * item.rate).toFixed(2)}</td><td>${item.making.toFixed(2)}</td><td>0</td>
                <td>${item.taxableValue.toFixed(2)}</td><td>${cgst}</td><td>${sgst}</td><td><strong>${item.total.toFixed(2)}</strong></td>`;
        } else if (ind === 'Pharmacy') {
            subtotal += item.taxableValue; totalGst += item.gstAmount; totalQty += item.qty;
            let desc = `<strong>${item.name}</strong>`;
            let batchExp = `${item.dyn1 || '-'}<br><small>${item.dyn2 || '-'}</small>`;
            rowHtml += `
                <td>${desc}</td><td>${batchExp}</td><td style="text-align:center;">${item.qty}</td>
                <td>${item.rate.toFixed(2)}</td><td>${item.taxableValue.toFixed(2)}</td>
                <td style="text-align:center;">${item.gstRate}%</td><td>${item.gstAmount.toFixed(2)}</td><td style="text-align:right;"><strong>${item.total.toFixed(2)}</strong></td>`;
        } else {
            subtotal += item.taxableValue; totalGst += item.gstAmount; totalQty += item.qty;
            let desc = `<strong>${item.name}</strong>`;
            if(item.dyn1 && ind === 'Electronics') desc += `<br><small style="color:#475569;">Serial No: ${item.dyn1}</small>`;
            rowHtml += `
                <td>${desc}</td><td>${item.dyn3 || '-'}</td><td style="text-align:center;">${item.qty}</td>
                <td>${item.rate.toFixed(2)}</td><td>${item.taxableValue.toFixed(2)}</td>
                <td style="text-align:center;">${item.gstRate}%</td><td>${item.gstAmount.toFixed(2)}</td><td style="text-align:right;"><strong>${item.total.toFixed(2)}</strong></td>`;
        }

        rowHtml += `<td class="no-print"><button type="button" class="btn-warning" style="padding: 2px 6px;" onclick="editInvoiceItem(${index})">✎</button> <button type="button" class="btn-danger" style="padding: 2px 6px;" onclick="currentInvoice.splice(${index}, 1); renderInvoiceTable();">X</button></td>`;
        const tr = document.createElement('tr'); tr.innerHTML = rowHtml; tbody.appendChild(tr);
    });

    if (ind === 'Jewelry') {
        let hallmark = parseFloat(document.getElementById('billOtherCharge').value) || 0;
        const grandTaxable = subtotal + hallmark; totalGst = grandTaxable * 0.03; const gTotal = grandTaxable + totalGst;
        if(document.getElementById('subtotal')) document.getElementById('subtotal').innerText = subtotal.toFixed(2);
        if(document.getElementById('totalGst')) document.getElementById('totalGst').innerText = totalGst.toFixed(2);
        if(document.getElementById('grandTotal')) document.getElementById('grandTotal').innerText = gTotal.toFixed(2);
    } else {
        if (currentInvoice.length > 0) {
            let span1 = ind === 'Pharmacy' ? 2 : 3; 
            tbody.innerHTML += `<tr class="total-row industry-field standard-only"><td colspan="${span1}" style="text-align:right;">Sub-Total:</td><td style="text-align:center;">${totalQty}</td><td></td><td>${subtotal.toFixed(2)}</td><td></td><td>${totalGst.toFixed(2)}</td><td style="text-align:right;">${(subtotal + totalGst).toFixed(2)}</td><td class="no-print"></td></tr>`;
        }
        const gTotal = subtotal + totalGst;
        if(document.getElementById('subtotal')) document.getElementById('subtotal').innerText = subtotal.toFixed(2);
        if(document.getElementById('totalGst')) document.getElementById('totalGst').innerText = totalGst.toFixed(2);
        if(document.getElementById('grandTotal')) document.getElementById('grandTotal').innerText = gTotal.toFixed(2);
    }
    calculateDue();
    renderInvoiceQR();
    updateCheckoutFab();
}

function calculateDue() {
    const gTotal = parseFloat(document.getElementById('grandTotal').innerText) || 0;
    const paidInput = document.getElementById('billAmountPaid').value;
    const paidNow = paidInput === '' ? 0 : parseFloat(paidInput) || 0;
    let oldGold = parseFloat(document.getElementById('billOldGold') ? document.getElementById('billOldGold').value : 0) || 0;
    const balance = gTotal - paidNow - oldGold;
    if(document.getElementById('billBalanceDue')) document.getElementById('billBalanceDue').innerText = balance.toFixed(2);
}

function clearBillingCart(isSilent = false) {
    if(isSilent === true || confirm("Clear current bill?")) {
        currentInvoice = []; renderInvoiceTable(); clearBillingInputs();
        ['customerName','customerAddress','customerGstin','billAmountPaid','billOldGold','billDiscount','billOtherCharge','doctorName'].forEach(id=>{
            if(document.getElementById(id)) document.getElementById(id).value='';
        });
        if(document.getElementById('customerPhone')) document.getElementById('customerPhone').value = '+91 ';
    }
}

// ==========================================
// 6. SAFE SAVE, PRINT & CLOUD PUSH
// ==========================================
let isGeneratingInvoice = false;

function finalizeAndPrintInvoice() {
    if (currentInvoice.length === 0) return alert("Invoice is empty!");
    const ind = document.getElementById('industrySelector').value;
    const currentInv = getCurrInv();

    let cogsTotal = 0;
    currentInvoice.forEach(billedItem => {
        let invItem = currentInv.find(i => i.name === billedItem.name);
        if (invItem) invItem.qty -= billedItem.qty; 
        cogsTotal += billedItem.cost;
    });

    const invoiceNumStr = document.getElementById('invoiceNumber').innerText;
    const customerName = document.getElementById('customerName').value || 'Cash Customer';
    const grandTotal = parseFloat(document.getElementById('grandTotal').innerText);
    const paidInput = document.getElementById('billAmountPaid').value;
    const amountPaid = paidInput === '' ? 0 : parseFloat(paidInput) || 0;
    let oldGold = parseFloat(document.getElementById('billOldGold') ? document.getElementById('billOldGold').value : 0) || 0;
    const balanceDue = grandTotal - amountPaid - oldGold;
    
    let bDisc = parseFloat(document.getElementById('billDiscount') ? document.getElementById('billDiscount').value : 0) || 0;
    let bChrg = parseFloat(document.getElementById('billOtherCharge') ? document.getElementById('billOtherCharge').value : 0) || 0;

    const newBillData = {
        industry: ind, invoiceNo: invoiceNumStr, date: document.getElementById('currentDate').innerText, timestamp: new Date().toISOString(),
        customer: customerName, phone: document.getElementById('customerPhone').value || '', address: document.getElementById('customerAddress').value || '',
        gstin: document.getElementById('customerGstin').value || '', doctor: document.getElementById('doctorName') ? document.getElementById('doctorName').value : '',
        totalItems: currentInvoice.length, grandTotal: grandTotal.toFixed(2), amountPaid: amountPaid,
        oldGold: oldGold, discount: bDisc, hallmark: bChrg, cogsTotal: cogsTotal, status: balanceDue > 0 ? 'Credit' : 'Paid', items: [...currentInvoice]
    };

    billHistoryData.push(newBillData);

    if (customerName !== 'Cash Customer') {
        if (!customerLedgerData[customerName]) customerLedgerData[customerName] = { billed: 0, paid: 0, phone: '', address: '', gstin: '' };
        customerLedgerData[customerName].billed += grandTotal;
        customerLedgerData[customerName].paid += (amountPaid + oldGold);
        customerLedgerData[customerName].phone = document.getElementById('customerPhone').value;
        customerLedgerData[customerName].address = document.getElementById('customerAddress').value;
        customerLedgerData[customerName].gstin = document.getElementById('customerGstin').value;
    }

    localStorage.setItem('myBusinessBillHistory', JSON.stringify(billHistoryData));
    localStorage.setItem('myBusinessInventory', JSON.stringify(isolatedInventory));
    localStorage.setItem('myBusinessLedger', JSON.stringify(customerLedgerData));
    
    renderInventoryTable(); renderBillHistory(); renderStockStatement(); renderCustomerLedger(); runAlertsEngine();

    pushSaleToCloud(newBillData);
    syncAllToCloud(true);   // keep the Google Sheet mirror current (silent)

    isGeneratingInvoice = true;
    updatePrintDOM(); 
    
    setTimeout(() => { window.print(); }, 500); 
}

window.addEventListener('afterprint', () => {
    if(isGeneratingInvoice) {
        clearBillingCart(true); 
        nextInvoiceTracker++; 
        document.getElementById('invoiceNumber').innerText = `INV-${nextInvoiceTracker}`;
        isGeneratingInvoice = false;
    }
});

function reprintHistoricalBill(index) {
    const bill = billHistoryData[index];
    if(currentInvoice.length > 0) { if(!confirm("Unsaved bill in progress. Continue?")) return; }
    
    document.getElementById('industrySelector').value = bill.industry || 'Electronics'; updateIndustry();
    document.getElementById('invoiceNumber').innerText = bill.invoiceNo;
    document.getElementById('currentDate').innerText = bill.date;
    document.getElementById('customerName').value = bill.customer === 'Cash Customer' ? '' : bill.customer;
    if(document.getElementById('customerPhone')) document.getElementById('customerPhone').value = bill.phone || '+91 ';
    if(document.getElementById('customerAddress')) document.getElementById('customerAddress').value = bill.address || '';
    if(document.getElementById('customerGstin')) document.getElementById('customerGstin').value = bill.gstin || '';
    if(document.getElementById('doctorName')) document.getElementById('doctorName').value = bill.doctor || '';
    
    // BUG FIX 1: Restore Old Gold & Hallmark memory
    if(document.getElementById('billAmountPaid')) document.getElementById('billAmountPaid').value = bill.amountPaid || bill.grandTotal;
    if(document.getElementById('billOldGold')) document.getElementById('billOldGold').value = bill.oldGold || '';
    if(document.getElementById('billOtherCharge')) document.getElementById('billOtherCharge').value = bill.hallmark || '';
    if(document.getElementById('billDiscount')) document.getElementById('billDiscount').value = bill.discount || '';

    currentInvoice = [...bill.items]; renderInvoiceTable(); switchView('billing', document.querySelector('.menu-item.active'));
    
    updatePrintDOM(); 
    
    setTimeout(() => { 
        window.print(); 
        setTimeout(() => {
            document.getElementById('currentDate').innerText = new Date().toLocaleDateString('en-IN'); 
            clearBillingCart(true);
            document.getElementById('invoiceNumber').innerText = `INV-${nextInvoiceTracker}`;
        }, 500);
    }, 500);
}

function editHistoricalBill(index) {
    if(currentInvoice.length > 0) { if(!confirm("Unsaved bill in progress. Continue?")) return; }
    const bill = billHistoryData[index];
    if(!confirm(`Edit Invoice ${bill.invoiceNo}? This returns items to stock and reverses ledger entries.`)) return;

    const ind = bill.industry || 'Electronics';
    if (!isolatedInventory[ind]) isolatedInventory[ind] = []; let inv = isolatedInventory[ind];
    bill.items.forEach(billedItem => { let invItem = inv.find(i => i.name === billedItem.name); if (invItem) invItem.qty += billedItem.qty; });

    if (bill.customer && bill.customer !== 'Cash Customer' && customerLedgerData[bill.customer]) {
        customerLedgerData[bill.customer].billed -= parseFloat(bill.grandTotal);
        customerLedgerData[bill.customer].paid -= (parseFloat(bill.amountPaid) + parseFloat(bill.oldGold || 0));
    }

    document.getElementById('industrySelector').value = ind; updateIndustry();
    document.getElementById('invoiceNumber').innerText = bill.invoiceNo;
    document.getElementById('currentDate').innerText = bill.date;
    document.getElementById('customerName').value = bill.customer === 'Cash Customer' ? '' : bill.customer;
    if(document.getElementById('customerPhone')) document.getElementById('customerPhone').value = bill.phone || '+91 ';
    if(document.getElementById('customerAddress')) document.getElementById('customerAddress').value = bill.address || '';
    if(document.getElementById('doctorName')) document.getElementById('doctorName').value = bill.doctor || '';
    
    // BUG FIX 1: Restore Old Gold & Hallmark memory
    if(document.getElementById('billAmountPaid')) document.getElementById('billAmountPaid').value = bill.amountPaid || bill.grandTotal;
    if(document.getElementById('billOldGold')) document.getElementById('billOldGold').value = bill.oldGold || '';
    if(document.getElementById('billOtherCharge')) document.getElementById('billOtherCharge').value = bill.hallmark || '';
    if(document.getElementById('billDiscount')) document.getElementById('billDiscount').value = bill.discount || '';

    currentInvoice = [...bill.items]; billHistoryData.splice(index, 1);
    localStorage.setItem('myBusinessBillHistory', JSON.stringify(billHistoryData));
    localStorage.setItem('myBusinessInventory', JSON.stringify(isolatedInventory));
    localStorage.setItem('myBusinessLedger', JSON.stringify(customerLedgerData));
    
    renderInventoryTable(); renderBillHistory(); renderStockStatement(); renderCustomerLedger(); renderInvoiceTable();
    switchView('billing', document.querySelector('.menu-item.active'));
}

// ==========================================
// 7. PURCHASE MANAGEMENT
// ==========================================
function savePurchaseEntry() {
    const ind = document.getElementById('industrySelector').value; const currentInv = getCurrInv();
    const vendor = document.getElementById('purVendor').value; const item = document.getElementById('purItem').value;
    const qty = parseInt(document.getElementById('purQty').value) || 0; const cost = parseFloat(document.getElementById('purCost').value) || 0;
    const total = parseFloat(document.getElementById('purTotal').value) || (qty * cost); const paid = parseFloat(document.getElementById('purPaid').value) || 0;
    
    const batch = document.getElementById('purBatch').value;
    const hsnEl = document.getElementById('purHsn'); const gstEl = document.getElementById('purGst');
    const hsn = hsnEl ? hsnEl.value : ''; const gst = gstEl ? gstEl.value : ''; // BUGFIX: null-safe (fields were missing → crash)

    if(!vendor || !item || qty <= 0) return alert("Please fill Vendor, Item, and Qty correctly.");
    
    let found = currentInv.find(i => i.name.toLowerCase() === item.toLowerCase());
    if (found) { 
        found.qty += qty; found.cost = cost; 
        if(batch) found.batch = batch; if(hsn) found.hsn = hsn; if(gst) found.gst = gst;
    } else { 
        currentInv.push({ name: item, batch, hsn, gst, qty, cost, price: cost*1.2 }); 
    }

    if (!vendorLedgerData[vendor]) vendorLedgerData[vendor] = { billed: 0, paid: 0 };
    vendorLedgerData[vendor].billed += total; vendorLedgerData[vendor].paid += paid;

    const purchaseRec = { industry: ind, date: new Date().toLocaleDateString('en-IN'), vendor, billNo: document.getElementById('purBillNo').value, item, qty, cost, total, paid, status: (total - paid) > 0 ? 'Credit' : 'Paid' };
    purchaseHistoryData.push(purchaseRec);

    localStorage.setItem('myBusinessInventory', JSON.stringify(isolatedInventory));
    localStorage.setItem('myVendorLedger', JSON.stringify(vendorLedgerData));
    localStorage.setItem('myBusinessPurchases', JSON.stringify(purchaseHistoryData));

    pushPurchaseToCloud(purchaseRec);
    ['purVendor','purBillNo','purItem','purBatch','purHsn','purGst','purQty','purCost','purTotal','purPaid'].forEach(id => { const el = document.getElementById(id); if(el) el.value=''; });
    renderPurchaseHistory(); renderSupplierLedger(); renderInventoryTable(); renderStockStatement(); runAlertsEngine();
    alert("Purchase Logged & Stock Updated!");
}

function renderPurchaseHistory() {
    const ind = document.getElementById('industrySelector').value; const tbody = document.getElementById('purchaseHistoryBody'); if(!tbody) return; tbody.innerHTML = '';
    [...purchaseHistoryData].reverse().filter(p => p.industry === ind || !p.industry).forEach(p => {
        let sc = p.status === 'Credit' ? 'var(--warning)' : 'var(--success)';
        tbody.innerHTML += `<tr><td>${p.date}</td><td>${p.vendor}</td><td>${p.billNo}</td><td>${p.item}</td><td>${p.qty}</td><td>₹${p.total}</td><td style="color:${sc}; font-weight:bold;">${p.status}</td></tr>`;
    });
}

function populateVendorDatalist() {
    const dl = document.getElementById('vendorList'); if(!dl) return; dl.innerHTML = '';
    Object.keys(vendorLedgerData).forEach(name => { dl.innerHTML += `<option value="${name}">`; });
}

function renderSupplierLedger() {
    const tbody = document.getElementById('ledgerSupplierBody'); if(!tbody) return; tbody.innerHTML = ''; let globOut = 0;
    Object.keys(vendorLedgerData).forEach(name => {
        const d = vendorLedgerData[name]; const out = d.billed - d.paid;
        if (out > 0 || d.billed > 0) { 
            globOut += out;
            tbody.innerHTML += `<tr><td><strong>${name}</strong></td><td>₹${d.billed.toFixed(2)}</td><td style="color: var(--primary);">₹${d.paid.toFixed(2)}</td><td style="color: ${out > 0 ? 'var(--warning)' : '#64748b'}; font-weight: bold;">₹${out.toFixed(2)}</td><td>${out > 0 ? `<button type="button" class="btn-warning" style="padding: 4px 8px; font-size: 0.8em;" onclick="settleVendorPayment('${name}', ${out})">Pay</button>` : 'Clear'}</td></tr>`;
        }
    });
    if(document.getElementById('globalPayable')) document.getElementById('globalPayable').innerText = globOut.toFixed(2);
    populateVendorDatalist();
}

function settleVendorPayment(name, amountOwed) {
    const pay = prompt(`Pay supplier ${name}.\nOutstanding: ₹${amountOwed.toFixed(2)}\nEnter amount paying now:`, amountOwed);
    if (pay && !isNaN(pay)) { vendorLedgerData[name].paid += parseFloat(pay); localStorage.setItem('myVendorLedger', JSON.stringify(vendorLedgerData)); renderSupplierLedger(); runAnalyticsEngine(); }
}

// ==========================================
// 8. CUSTOMER LEDGER
// ==========================================
function populateCustomerDatalist() {
    const dl = document.getElementById('customerList'); if(!dl) return; dl.innerHTML = '';
    Object.keys(customerLedgerData).forEach(name => { dl.innerHTML += `<option value="${name}">`; });
}

function renderCustomerLedger() {
    const tbody = document.getElementById('ledgerCustomerBody'); tbody.innerHTML = ''; let globOut = 0;
    Object.keys(customerLedgerData).forEach(name => {
        const d = customerLedgerData[name]; const out = d.billed - d.paid;
        if (out > 0 || d.billed > 0) { 
            globOut += out;
            tbody.innerHTML += `<tr><td><strong>${name}</strong></td><td>₹${d.billed.toFixed(2)}</td><td style="color: var(--success);">₹${d.paid.toFixed(2)}</td><td style="color: ${out > 0 ? 'var(--danger)' : '#64748b'}; font-weight: bold;">₹${out.toFixed(2)}</td><td>${out > 0 ? `<button type="button" class="btn-success" style="padding: 4px 8px; font-size: 0.8em;" onclick="settleCustomerPayment('${name}', ${out})">Receive</button>` : 'Clear'}</td></tr>`;
        }
    });
    document.getElementById('globalOutstanding').innerText = globOut.toFixed(2); populateCustomerDatalist();
}

function settleCustomerPayment(name, amountOwed) {
    const pay = prompt(`Receive from ${name}.\nOutstanding: ₹${amountOwed.toFixed(2)}\nEnter amount received now:`, amountOwed);
    if (pay && !isNaN(pay)) { customerLedgerData[name].paid += parseFloat(pay); localStorage.setItem('myBusinessLedger', JSON.stringify(customerLedgerData)); renderCustomerLedger(); runAnalyticsEngine(); }
}

// ==========================================
// 9. ANALYTICS & STOCK
// ==========================================
function runAnalyticsEngine() {
    const ind = document.getElementById('industrySelector').value;
    let revenue = 0, cogs = 0, todaySales = 0, itemSalesCount = {}; 
    const todayStr = new Date().toLocaleDateString('en-IN');
    
    billHistoryData.filter(b => b.industry === ind || !b.industry).forEach(bill => {
        if(bill.date === todayStr) todaySales += parseFloat(bill.grandTotal);
        let billTaxable = 0;
        bill.items.forEach(i => { billTaxable += i.taxableValue; if(!itemSalesCount[i.name]) itemSalesCount[i.name] = 0; itemSalesCount[i.name] += i.qty; });
        revenue += billTaxable; cogs += (bill.cogsTotal || 0); 
    });
    
    const totalProfit = revenue - cogs; let marginPercent = revenue > 0 ? ((totalProfit / revenue) * 100).toFixed(1) : 0;
    let topItem = "-", maxQty = 0; for (const [name, qty] of Object.entries(itemSalesCount)) { if (qty > maxQty) { maxQty = qty; topItem = name; } }

    if(document.getElementById('dashTodaySales')) document.getElementById('dashTodaySales').innerText = todaySales.toFixed(2);
    if(document.getElementById('dashProfit')) document.getElementById('dashProfit').innerText = totalProfit.toFixed(2);
    if(document.getElementById('dashMargin')) document.getElementById('dashMargin').innerText = marginPercent;
    if(document.getElementById('dashTopItem')) document.getElementById('dashTopItem').innerText = topItem;
    
    let receivables = 0; Object.values(customerLedgerData).forEach(d => { let out = d.billed - d.paid; if(out>0) receivables+=out; });
    if(document.getElementById('dashReceivable')) document.getElementById('dashReceivable').innerText = receivables.toFixed(2);
    
    let payables = 0; Object.values(vendorLedgerData).forEach(d => { let out = d.billed - d.paid; if(out>0) payables+=out; });
    if(document.getElementById('dashPayable')) document.getElementById('dashPayable').innerText = payables.toFixed(2);

    renderSalesChart();
}

function runAlertsEngine() {
    const ind = document.getElementById('industrySelector').value; const currentInv = getCurrInv();
    const lowStockUl = document.getElementById('lowStockList'); const expiryUl = document.getElementById('expiryList'); if(!lowStockUl) return;
    lowStockUl.innerHTML = ''; expiryUl.innerHTML = ''; let alertCount = 0;

    currentInv.forEach(item => {
        if (item.qty <= 5) { alertCount++; lowStockUl.innerHTML += `<li><span class="badge badge-warning">${ind}</span> <strong>${item.name}</strong> - Only ${item.qty} left!</li>`; }
        if (ind === 'Pharmacy' && item.expiry) {
            const parts = item.expiry.split('/');
            if (parts.length === 2) {
                const expDate = new Date(2000 + parseInt(parts[1]), parseInt(parts[0]) - 1, 1);
                const diffDays = Math.ceil(Math.abs(expDate - new Date()) / (1000 * 60 * 60 * 24)); 
                if (expDate < new Date() || diffDays <= 90) {
                    alertCount++; const status = expDate < new Date() ? 'EXPIRED' : `Expiring in ${diffDays} days`;
                    expiryUl.innerHTML += `<li><strong>${item.name}</strong> - <span style="color:var(--danger); font-weight:bold;">${status}</span></li>`;
                }
            }
        }
    });
    if(lowStockUl.innerHTML === '') lowStockUl.innerHTML = '<li style="color:var(--success);">All stock levels look healthy!</li>';
    if(expiryUl.innerHTML === '') expiryUl.innerHTML = '<li style="color:var(--success);">No upcoming expirations detected.</li>';
    document.querySelectorAll('.badge-alert-count').forEach(b => { if (alertCount > 0) { b.innerText = alertCount; b.style.display = 'inline-block'; } else { b.style.display = 'none'; } });
}

function renderBillHistory() {
    const ind = document.getElementById('industrySelector').value; const tbody = document.getElementById('historyBody'); tbody.innerHTML = ''; let totalSales = 0;
    billHistoryData.map((b, idx) => ({...b, originalIndex: idx})).filter(b => b.industry === ind || !b.industry).reverse().forEach(bill => {
        totalSales += parseFloat(bill.grandTotal);
        let statusColor = bill.status === 'Credit' ? 'var(--danger)' : 'var(--success)';
        tbody.innerHTML += `<tr><td>${bill.date}</td><td><strong>${bill.invoiceNo}</strong></td><td>${bill.customer}</td><td style="color: var(--success); font-weight: bold;">₹${bill.grandTotal}</td><td style="color: ${statusColor}; font-weight: bold;">${bill.status || 'Paid'}</td><td style="white-space: nowrap;"><button type="button" class="btn-info" style="padding: 4px 8px; margin-right: 5px;" onclick="reprintHistoricalBill(${bill.originalIndex})">🖨️</button> <button type="button" class="btn-warning" style="padding: 4px 8px; margin-right: 5px;" onclick="editHistoricalBill(${bill.originalIndex})">✎</button> <button type="button" class="btn-danger" style="padding: 4px 8px;" onclick="deleteHistoricalBill(${bill.originalIndex})">X</button></td></tr>`;
    });
    if(document.getElementById('historyTotalSales')) document.getElementById('historyTotalSales').innerText = totalSales.toFixed(2);
}

function deleteHistoricalBill(index) {
    if(confirm("Delete this bill record? This does not refund ledger balances or return stock.")) {
        billHistoryData.splice(index, 1); localStorage.setItem('myBusinessBillHistory', JSON.stringify(billHistoryData)); renderBillHistory(); renderStockStatement(); runAnalyticsEngine();
    }
}

function renderInventoryTable() {
    const ind = document.getElementById('industrySelector').value; const currentInv = getCurrInv(); const tbody = document.getElementById('inventoryBody'); tbody.innerHTML = ''; 
    currentInv.forEach((item, index) => {
        let rowHtml = `<td>${item.name}</td><td>${item.batch||'-'}</td>`;
        if (ind === 'Pharmacy') rowHtml += `<td>${item.expiry || '-'}</td><td>${item.gst || '0'}%</td>`;
        else if (ind === 'Electronics' || ind === 'Grocery') rowHtml += `<td>${item.hsn || '-'}</td><td>${item.gst || '0'}%</td>`;
        else if (ind === 'Jewelry') rowHtml += `<td>${item.weight || '0'}g</td><td>${item.purity || '-'}</td><td>₹${item.making || '0'}</td>`;
        rowHtml += `<td style="color: #64748b;">₹${item.cost || '0.00'}</td><td>₹${item.price}</td><td style="color:${item.qty<5?'var(--danger)':'var(--success)'}; font-weight:bold;">${item.qty}</td><td style="white-space: nowrap;"><button type="button" class="btn-warning" style="padding: 4px 8px;" onclick="editInvItem(${index})">✎</button> <button type="button" class="btn-danger" style="padding: 4px 8px;" onclick="deleteInvItem(${index})">X</button></td>`;
        const tr = document.createElement('tr'); tr.innerHTML = rowHtml; tbody.appendChild(tr);
    });
    document.getElementById('totalItems').innerText = currentInv.length; localStorage.setItem('myBusinessInventory', JSON.stringify(isolatedInventory));
    const dl = document.getElementById('inventoryList'); dl.innerHTML = ''; currentInv.forEach(i => { if(i.qty>0 || ind==='Jewelry') dl.innerHTML += `<option value="${i.name}">`; });
}

function filterInventory() {
    const query = document.getElementById('invSearchBox').value.toLowerCase(); const rows = document.getElementById('inventoryBody').getElementsByTagName('tr');
    for (let i = 0; i < rows.length; i++) { rows[i].style.display = rows[i].innerText.toLowerCase().includes(query) ? '' : 'none'; }
}

function addOrUpdateInventoryItem() {
    const ind = document.getElementById('industrySelector').value; const currentInv = getCurrInv();
    const name = document.getElementById('invName').value; const batch = document.getElementById('invBatch').value;
    const qty = parseInt(document.getElementById('invQty').value) || 0; const cost = parseFloat(document.getElementById('invCost').value) || 0; const price = parseFloat(document.getElementById('invPrice').value) || 0;
    
    if(!name) return alert("Please enter an Item Name.");
    let hsn='', gst='0', weight='', purity='', making='', expiry='';
    if(ind === 'Electronics' || ind === 'Grocery') { hsn = document.getElementById('invHsn').value; gst = document.getElementById('invGst').value; }
    if(ind === 'Pharmacy') { hsn = document.getElementById('invHsn').value; gst = document.getElementById('invGst').value; expiry = document.getElementById('invExpiry').value; }
    if(ind === 'Jewelry') { weight = document.getElementById('invWeight').value; purity = document.getElementById('invPurity').value; making = document.getElementById('invMaking').value; }
    
    const itemObj = { name, batch, qty, cost, price, hsn, gst, weight, purity, making, expiry };

    if (editingInvIndex > -1) { currentInv[editingInvIndex] = itemObj; alert("Inventory updated!"); cancelInvEdit(); } 
    else { currentInv.push(itemObj); clearInvInputs(); }
    renderInventoryTable(); renderStockStatement(); runAlertsEngine();
}

function editInvItem(index) {
    const ind = document.getElementById('industrySelector').value; const currentInv = getCurrInv(); editingInvIndex = index; const item = currentInv[index];
    document.getElementById('invName').value = item.name; document.getElementById('invBatch').value = item.batch || '';
    document.getElementById('invQty').value = item.qty; document.getElementById('invCost').value = item.cost || ''; document.getElementById('invPrice').value = item.price;
    if(ind === 'Electronics' || ind === 'Grocery') { document.getElementById('invHsn').value = item.hsn || ''; document.getElementById('invGst').value = item.gst || '0'; }
    if(ind === 'Pharmacy') { document.getElementById('invHsn').value = item.hsn || ''; document.getElementById('invGst').value = item.gst || '0'; document.getElementById('invExpiry').value = item.expiry || ''; }
    if(ind === 'Jewelry') { document.getElementById('invWeight').value = item.weight || ''; document.getElementById('invPurity').value = item.purity || ''; document.getElementById('invMaking').value = item.making || ''; }
    document.getElementById('invActionBtn').innerText = "✓ Update Stock"; document.getElementById('invActionBtn').classList.replace("btn-success", "btn-warning"); 
    document.getElementById('invCancelBtn').style.display = "inline-block"; document.getElementById('invName').focus();
}

function clearInvInputs() {
    ['invName','invBatch','invQty','invCost','invPrice','invHsn','invWeight','invPurity','invMaking','invExpiry'].forEach(id => { if(document.getElementById(id)) document.getElementById(id).value = ''; });
}
function cancelInvEdit() { editingInvIndex = -1; clearInvInputs(); document.getElementById('invActionBtn').innerText = "+ Quick Add"; document.getElementById('invActionBtn').classList.remove("btn-warning"); document.getElementById('invCancelBtn').style.display = "none"; }
function deleteInvItem(index) { if(confirm("Are you sure you want to delete this item?")) { if (editingInvIndex === index) cancelInvEdit(); getCurrInv().splice(index, 1); renderInventoryTable(); renderStockStatement(); runAlertsEngine(); } }

function renderStockStatement() {
    const ind = document.getElementById('industrySelector').value; const currentInv = getCurrInv(); const tbody = document.getElementById('ledgerBody'); if(!tbody) return; tbody.innerHTML = ''; let totalClosingValue = 0;
    const issuedMap = {}; const receivedMap = {};
    const fromDateStr = document.getElementById('stockFilterFrom').value; const toDateStr = document.getElementById('stockFilterTo').value;
    let fromDate = fromDateStr ? new Date(fromDateStr + "T00:00:00") : new Date(0); let toDate = toDateStr ? new Date(toDateStr + "T23:59:59") : new Date("2100-01-01");

    billHistoryData.forEach(bill => {
        if (bill.industry === ind || !bill.industry) { 
            const bDate = parseIndDate(bill.date);
            if (bDate >= fromDate && bDate <= toDate) { bill.items.forEach(item => { if(!issuedMap[item.name]) issuedMap[item.name] = 0; issuedMap[item.name] += item.qty; }); }
        }
    });

    purchaseHistoryData.forEach(pur => {
        if (pur.industry === ind) {
            const pDate = parseIndDate(pur.date);
            if (pDate >= fromDate && pDate <= toDate) { if(!receivedMap[pur.item]) receivedMap[pur.item] = 0; receivedMap[pur.item] += pur.qty; }
        }
    });

    currentInv.forEach(item => {
        const issuedQty = issuedMap[item.name] || 0; const receivedQty = receivedMap[item.name] || 0; const closingQty = item.qty; const stockValue = closingQty * item.cost; 
        if((fromDateStr || toDateStr) && issuedQty === 0 && receivedQty === 0) return;
        totalClosingValue += stockValue;
        tbody.innerHTML += `<tr><td><strong>${item.name}</strong></td><td>${item.batch || '-'}</td><td style="color: var(--success); font-weight: bold;">${receivedQty}</td><td style="color: var(--warning); font-weight: bold;">${issuedQty}</td><td style="background-color: var(--info-light); font-weight: bold;">${closingQty}</td><td style="font-weight: bold;">₹${stockValue.toFixed(2)}</td></tr>`;
    });
    if(document.getElementById('ledgerTotalValue')) document.getElementById('ledgerTotalValue').innerText = totalClosingValue.toFixed(2);
}

// ==========================================
// 10. EXPORT & DATA
// ==========================================
function exportToCSV(type) {
    let csvContent = "data:text/csv;charset=utf-8,"; const ind = document.getElementById('industrySelector').value;
    if(type === 'inventory') { csvContent += "Item Name,Batch/SKU,HSN,Qty,Cost,Price\n"; getCurrInv().forEach(i => { csvContent += `${i.name},${i.batch||''},${i.hsn||''},${i.qty},${i.cost},${i.price}\n`; }); } 
    else if (type === 'sales') { csvContent += "Date,Invoice No,Customer,Total Items,Grand Total,Status\n"; billHistoryData.filter(b => b.industry === ind).forEach(b => { csvContent += `${b.date},${b.invoiceNo},${b.customer},${b.totalItems},${b.grandTotal},${b.status}\n`; }); }
    const encodedUri = encodeURI(csvContent); const link = document.createElement("a"); link.setAttribute("href", encodedUri); link.setAttribute("download", `${ind}_${type}_export.csv`); document.body.appendChild(link); link.click(); document.body.removeChild(link);
}
function exportData() { const a = document.createElement('a'); a.href = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify({ inventory: isolatedInventory, settings: shopSettings, billHistory: billHistoryData, ledger: customerLedgerData, purchases: purchaseHistoryData, vendorLedger: vendorLedgerData })); a.download = "om_betar_erp_backup.json"; document.body.appendChild(a); a.click(); a.remove(); }
function importData() {
    const file = document.getElementById('restoreFile').files[0]; if(!file) return;
    const reader = new FileReader(); reader.onload = e => {
        try {
            const data = JSON.parse(e.target.result);
            if(data.inventory) isolatedInventory = data.inventory; if(data.settings) shopSettings = data.settings; if(data.billHistory) billHistoryData = data.billHistory;
            if(data.ledger) customerLedgerData = data.ledger; if(data.purchases) purchaseHistoryData = data.purchases; if(data.vendorLedger) vendorLedgerData = data.vendorLedger;
            applySettingsToUI(); updateIndustry(); 
            let maxNum = 1000;
            billHistoryData.forEach(b => { if(b && typeof b.invoiceNo === 'string' && b.invoiceNo.includes('-')) { let p = parseInt(b.invoiceNo.split('-')[1]); if(!isNaN(p) && p > maxNum) maxNum = p; } });
            nextInvoiceTracker = maxNum + 1; document.getElementById('invoiceNumber').innerText = `INV-${nextInvoiceTracker}`;
            alert("System restored!"); location.reload();
        } catch(err) { alert("Invalid backup file."); }
    }; reader.readAsText(file);
}
function clearSystemData() { if(confirm("WARNING: This deletes ALL data! Type 'YES' to confirm.")) { if(prompt("Type YES to delete everything") === "YES") { localStorage.clear(); location.reload(); } } }
// ==========================================
// 11. GEMINI VISION ENGINE (key-based, client-side)
// ==========================================
function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve({ mimeType: file.type || 'image/jpeg', data: r.result.split(',')[1] });
        r.onerror = reject;
        r.readAsDataURL(file);
    });
}

// Low-level call: send an image + prompt to Gemini, ask for strict JSON back.
async function geminiVisionJSON(file, prompt) {
    const model = shopSettings.geminiModel || 'gemini-2.5-flash';
    const key = shopSettings.geminiKey;
    if (!key) throw new Error("No Gemini API key set (Settings → AI & Cloud).");
    const img = await fileToBase64(file);
    const body = {
        contents: [{ parts: [ { text: prompt }, { inline_data: { mime_type: img.mimeType, data: img.data } } ] }],
        generationConfig: { temperature: 0.1, responseMimeType: "application/json" }
    };
    const res = await fetch(`${GEMINI_BASE}/${model}:generateContent?key=${encodeURIComponent(key)}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
    });
    if (!res.ok) {
        let msg = `Gemini error ${res.status}`;
        try { const e = await res.json(); if (e.error && e.error.message) msg += `: ${e.error.message}`; } catch(_) {}
        throw new Error(msg);
    }
    const data = await res.json();
    let text = '';
    try { text = data.candidates[0].content.parts.map(p => p.text || '').join(''); } catch(_) { throw new Error("Gemini returned no readable content."); }
    text = text.replace(/```json|```/g, '').trim();
    return JSON.parse(text);
}

// AI Module A (Gemini): single product label -> stock fields
async function geminiExtractProduct(file) {
    const status = document.getElementById('aiLoadingStatus');
    if (status) { status.innerText = "Reading label with Gemini… ⏳"; status.style.display = 'inline-block'; }
    const prompt = `You are reading a single retail product label/box. Return ONLY JSON with keys:
{"name": string, "mrp": number, "cost": number, "batch": string, "expiry": string, "hsn": string, "gst": number}
Rules: "mrp" = printed MRP/retail price (number only). "cost" = your best estimate of trade/purchase price; if unknown set to about 80% of mrp. "expiry" as printed (e.g. "12/2027" or "Dec 2027"), else "". "batch" = batch/lot/serial if present, else "". "hsn" only if printed, else "". "gst" tax percent if printed else 0. Use "" or 0 when unknown. No commentary.`;
    try {
        const o = await geminiVisionJSON(file, prompt);
        const set = (id, v) => { const el = document.getElementById(id); if (el && v !== undefined && v !== null && v !== '') el.value = v; };
        set('aiInvName', o.name);
        set('aiInvBatch', o.batch);
        set('aiInvExpiry', o.expiry);
        set('aiInvPrice', o.mrp);
        set('aiInvCost', o.cost || (o.mrp ? +(o.mrp * 0.8).toFixed(2) : ''));
        alert("✅ Gemini read the label. Review the fields, then Confirm & Add to Stock.");
    } catch (e) {
        alert("Gemini scan failed: " + e.message + "\n\nTip: check the API key/model in Settings, or switch AI Engine to 'Offline OCR'.");
    } finally {
        if (status) { status.style.display = 'none'; status.innerText = "Analyzing Label… ⏳"; }
        document.getElementById('aiImageInput').value = '';
    }
}

// AI Module B (Gemini): full multi-item purchase invoice -> draft queue
async function geminiProcessPurchaseInvoice(file) {
    const status = document.getElementById('aiInvoiceLoading');
    if (status) { status.innerText = "Reading invoice with Gemini… ⏳"; status.style.display = 'inline-block'; }
    const prompt = `You are reading a supplier purchase invoice/bill. Return ONLY JSON:
{"vendor": string, "billNo": string, "date": string,
 "items": [ {"name": string, "hsn": string, "gst": number, "serials": string, "qty": number, "rate": number, "amount": number} ] }
Rules: one object per line-item/product row. "serials" = comma-separated IMEI/serial/batch numbers for that item if any, else "". "gst" = total GST percent for that line (add CGST+SGST if shown separately), else 0. "rate" = per-unit price excluding tax if determinable, else the unit price shown. "qty" defaults to 1 if missing. Skip subtotal/total/tax-summary rows. No commentary.`;
    try {
        const o = await geminiVisionJSON(file, prompt);
        currentGlobalVendor = o.vendor || '';
        currentGlobalBill = o.billNo || '';
        window.aiDraftItems = (o.items || []).filter(it => it && it.name).map(it => ({
            name: String(it.name).slice(0, 60),
            hsn: it.hsn || '',
            serials: it.serials || '',
            qty: parseInt(it.qty) || 1,
            rate: parseFloat(it.rate) || parseFloat(it.amount) || 0,
            gst: parseFloat(it.gst) || 0,
            originalLine: it.name
        }));
        if (window.aiDraftItems.length > 0) renderAiDraftQueue();
        alert(`✅ Gemini parsed the invoice. Found ${window.aiDraftItems.length} item(s).\nVendor: ${currentGlobalVendor || '—'} | Bill: ${currentGlobalBill || '—'}\nLoad each item to review before saving.`);
    } catch (e) {
        alert("Gemini invoice scan failed: " + e.message + "\n\nTip: check the API key/model in Settings, or switch AI Engine to 'Offline OCR'.");
    } finally {
        if (status) { status.style.display = 'none'; status.innerText = "Reading Document… ⏳"; }
        document.getElementById('aiInvoiceInput').value = '';
    }
}

async function testGeminiKey() {
    if (!shopSettings.geminiKey) return alert("Enter and save a Gemini API key first.");
    try {
        const model = shopSettings.geminiModel || 'gemini-2.5-flash';
        const res = await fetch(`${GEMINI_BASE}/${model}:generateContent?key=${encodeURIComponent(shopSettings.geminiKey)}`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: "Reply with the single word: OK" }] }] })
        });
        if (res.ok) alert("✅ Gemini key works with model '" + model + "'.");
        else { const e = await res.json().catch(() => ({})); alert("❌ Gemini rejected the request: " + (e.error ? e.error.message : res.status)); }
    } catch (e) { alert("❌ Network error: " + e.message); }
}

// ==========================================
// 12. AI & CLOUD SETTINGS (persist new fields)
// ==========================================
function applyAiCloudSettingsToUI() {
    const map = { setAiEngine: 'aiEngine', setGeminiKey: 'geminiKey', setGeminiModel: 'geminiModel', setCloudUrl: 'cloudUrl' };
    Object.entries(map).forEach(([id, key]) => { const el = document.getElementById(id); if (el) el.value = shopSettings[key] || ''; });
    toggleGeminiFields();
}

function toggleGeminiFields() {
    const sel = document.getElementById('setAiEngine');
    const box = document.getElementById('geminiFieldsBox');
    if (sel && box) box.style.display = (sel.value === 'gemini') ? 'flex' : 'none';
}

function saveAiCloudSettings() {
    const map = { setAiEngine: 'aiEngine', setGeminiKey: 'geminiKey', setGeminiModel: 'geminiModel', setCloudUrl: 'cloudUrl' };
    Object.entries(map).forEach(([id, key]) => { const el = document.getElementById(id); if (el) shopSettings[key] = el.value.trim(); });
    localStorage.setItem('myBusinessSettings', JSON.stringify(shopSettings));
    alert("AI & Cloud settings saved.");
}

// ==========================================
// 13. ACTIVATION + MASTER KEY (validated via Google Sheet)
// ==========================================
function setLicense(obj) {
    licenseState = { ...licenseState, ...obj };
    localStorage.setItem('erpLicense', JSON.stringify(licenseState));
    refreshLicenseUI();
}

async function activateKey() {
    const input = document.getElementById('actKeyInput');
    const msg = document.getElementById('actMsg');
    const key = (input ? input.value : '').trim();
    if (!key) { if (msg) msg.innerText = "Enter an activation key."; return; }

    // Owner override — works offline.
    if (key === MASTER_KEY) {
        setLicense({ activated: true, key, plan: 'MASTER', expiry: '', mode: 'master' });
        finishActivation("Master access granted.");
        return;
    }

    const url = shopSettings.cloudUrl ? shopSettings.cloudUrl.trim() : '';
    if (!url) { if (msg) msg.innerText = "No Google Sheet URL set. Use the master key, or add the URL in Settings → AI & Cloud first."; return; }

    if (msg) msg.innerText = "Checking key…";
    try {
        const q = `${url}?action=validate&key=${encodeURIComponent(key)}&device=${encodeURIComponent(getDeviceId())}`;
        const res = await fetch(q, { method: 'GET', redirect: 'follow' });
        const data = JSON.parse(await res.text());
        if (data.valid) {
            setLicense({ activated: true, key, plan: data.plan || 'STANDARD', expiry: data.expiry || '', mode: 'key' });
            finishActivation(data.message || "Activated successfully.");
        } else {
            if (msg) msg.innerText = "❌ " + (data.message || "Invalid or blocked key.");
        }
    } catch (e) {
        if (msg) msg.innerText = "❌ Could not reach the license server. Check the URL/deployment. (" + e.message + ")";
    }
}

function finishActivation(text) {
    const overlay = document.getElementById('activationOverlay');
    if (overlay) overlay.style.display = 'none';
    refreshLicenseUI();
    alert("✅ " + text);
}

function refreshLicenseUI() {
    const badge = document.getElementById('licenseStatusText');
    if (badge) {
        if (licenseState.activated) {
            badge.innerHTML = `Status: <strong style="color:var(--success)">Active</strong> &nbsp;|&nbsp; Plan: <strong>${licenseState.plan || '—'}</strong>` +
                (licenseState.expiry ? ` &nbsp;|&nbsp; Expires: <strong>${licenseState.expiry}</strong>` : ` &nbsp;|&nbsp; <strong>Lifetime</strong>`) +
                `<br><small style="color:var(--text-muted)">Key: ${maskKey(licenseState.key)} &nbsp;·&nbsp; Device: ${getDeviceId()}</small>`;
        } else {
            badge.innerHTML = `Status: <strong style="color:var(--danger)">Not activated</strong>`;
        }
    }
}

function maskKey(k) { if (!k) return '—'; return k.length <= 6 ? k : k.slice(0, 4) + '••••' + k.slice(-2); }

function deactivateLicense() {
    if (!confirm("Sign out / deactivate on this device? You'll need to re-enter the key.")) return;
    licenseState = { activated: false, key: '', plan: '', expiry: '', mode: '' };
    localStorage.setItem('erpLicense', JSON.stringify(licenseState));
    refreshLicenseUI();
    enforceActivation();
}

// ==========================================
// 14. GOOGLE SHEET SYNC (all data)
// ==========================================
function collectAllData() {
    return {
        settings: shopSettings,
        inventory: isolatedInventory,
        billHistory: billHistoryData,
        purchases: purchaseHistoryData,
        customerLedger: customerLedgerData,
        vendorLedger: vendorLedgerData
    };
}

// Provider dispatcher — Settings → cloudProvider decides where data goes.
async function syncAllToCloud(silent) {
    const p = shopSettings.cloudProvider || 'sheets';
    if (p === 'firebase' || p === 'both') await firebaseSyncAll(silent);
    if (p === 'sheets'   || p === 'both') await sheetSyncAll(silent);
    if (!silent && p !== 'firebase' && p !== 'sheets' && p !== 'both') alert("No cloud provider selected.");
}

async function sheetSyncAll(silent) {
    const url = shopSettings.cloudUrl ? shopSettings.cloudUrl.trim() : '';
    if (!url) { if (!silent) alert("Set the Google Sheet URL in Settings → AI & Cloud first."); return; }
    try {
        await fetch(url, {
            method: 'POST', redirect: 'follow',
            body: JSON.stringify({ action: 'sync', license: licenseState.key, deviceId: getDeviceId(), payload: collectAllData() })
        });
        if (!silent) alert("✅ All data pushed to your Google Sheet.");
        console.log("✅ Sheet sync complete");
    } catch (e) { if (!silent) alert("Sheet sync failed: " + e.message); }
}

async function pullFromCloud() {
    const p = shopSettings.cloudProvider || 'sheets';
    if (p === 'firebase') return firebasePull();
    const url = shopSettings.cloudUrl ? shopSettings.cloudUrl.trim() : '';
    if (!url) return alert("Set the Google Sheet URL in Settings → AI & Cloud first.");
    if (!confirm("Pull the latest data from the Google Sheet?\nThis OVERWRITES the data on this device.")) return;
    try {
        const res = await fetch(`${url}?action=pull&license=${encodeURIComponent(licenseState.key)}`, { method: 'GET', redirect: 'follow' });
        const data = JSON.parse(await res.text());
        const p = data.payload || data;
        if (!p || !p.inventory) return alert("No backup found in the sheet yet. Use 'Sync Now' from a device that has data first.");
        if (p.inventory) isolatedInventory = p.inventory;
        if (p.billHistory) billHistoryData = p.billHistory;
        if (p.purchases) purchaseHistoryData = p.purchases;
        if (p.customerLedger) customerLedgerData = p.customerLedger;
        if (p.vendorLedger) vendorLedgerData = p.vendorLedger;
        if (p.settings) shopSettings = { ...shopSettings, ...p.settings };
        localStorage.setItem('myBusinessInventory', JSON.stringify(isolatedInventory));
        localStorage.setItem('myBusinessBillHistory', JSON.stringify(billHistoryData));
        localStorage.setItem('myBusinessPurchases', JSON.stringify(purchaseHistoryData));
        localStorage.setItem('myBusinessLedger', JSON.stringify(customerLedgerData));
        localStorage.setItem('myVendorLedger', JSON.stringify(vendorLedgerData));
        localStorage.setItem('myBusinessSettings', JSON.stringify(shopSettings));
        alert("✅ Pulled latest data from the sheet. Reloading…");
        location.reload();
    } catch (e) { alert("Pull failed: " + e.message); }
}

async function testCloudConnection() {
    const url = shopSettings.cloudUrl ? shopSettings.cloudUrl.trim() : '';
    if (!url) return alert("Enter and save the Google Sheet URL first.");
    try {
        const res = await fetch(`${url}?action=ping`, { method: 'GET', redirect: 'follow' });
        const data = JSON.parse(await res.text());
        alert(data.ok ? "✅ Connected to your Google Sheet Web App." : "Reached the URL but got an unexpected reply.");
    } catch (e) { alert("❌ Could not reach the Web App. Re-check the /exec URL and that it's deployed to 'Anyone'. (" + e.message + ")"); }
}

// ==========================================
// 15. FIREBASE (FIRESTORE) CLOUD PROVIDER
// ==========================================
const FIREBASE_VER = "12.13.0";
let _fb = null, _fbDb = null, _fbReady = null;

function parseFirebaseConfig() {
    try { const c = JSON.parse(shopSettings.firebaseConfig || '{}'); return c.projectId ? c : null; }
    catch (e) { return null; }
}

function loadScriptOnce(src) {
    return new Promise((resolve, reject) => {
        if ([...document.scripts].some(s => s.src === src)) return resolve();
        const s = document.createElement('script'); s.src = src;
        s.onload = resolve; s.onerror = () => reject(new Error("Failed to load " + src));
        document.head.appendChild(s);
    });
}

async function initFirebase() {
    if (_fbReady) return _fbReady;
    _fbReady = (async () => {
        const cfg = parseFirebaseConfig();
        if (!cfg) throw new Error("Firebase config missing/invalid (Settings → AI & Cloud).");
        await loadScriptOnce(`https://www.gstatic.com/firebasejs/${FIREBASE_VER}/firebase-app-compat.js`);
        await loadScriptOnce(`https://www.gstatic.com/firebasejs/${FIREBASE_VER}/firebase-firestore-compat.js`);
        if (!window.firebase.apps.length) _fb = window.firebase.initializeApp(cfg);
        else _fb = window.firebase.app();
        _fbDb = window.firebase.firestore();
        return _fbDb;
    })();
    return _fbReady;
}

// All data lives under: businesses/{licenseKeyOrDevice}/snapshot/all
function fbDocRef(db) {
    const id = (licenseState.key || getDeviceId()).replace(/[^A-Za-z0-9_-]/g, '_');
    return db.collection('businesses').doc(id || 'default');
}

async function firebaseSyncAll(silent) {
    try {
        const db = await initFirebase();
        await fbDocRef(db).set({
            updatedAt: new Date().toISOString(), device: getDeviceId(), license: licenseState.key || '',
            payload: collectAllData()
        }, { merge: true });
        if (!silent) alert("✅ All data synced to Firebase.");
        console.log("✅ Firebase sync complete");
    } catch (e) { if (!silent) alert("Firebase sync failed: " + e.message); else console.warn("Firebase sync:", e.message); }
}

async function firebasePull() {
    if (!confirm("Pull the latest data from Firebase?\nThis OVERWRITES the data on this device.")) return;
    try {
        const db = await initFirebase();
        const snap = await fbDocRef(db).get();
        if (!snap.exists) return alert("No Firebase data found yet. Use 'Sync Now' from a device that has data first.");
        const p = (snap.data() || {}).payload;
        if (!p || !p.inventory) return alert("Firebase doc has no usable snapshot yet.");
        applyPulledPayload(p);
        alert("✅ Pulled latest data from Firebase. Reloading…");
        location.reload();
    } catch (e) { alert("Firebase pull failed: " + e.message); }
}

async function testFirebase() {
    try {
        const db = await initFirebase();
        await db.collection('_diagnostics').doc('ping').set({ at: new Date().toISOString(), device: getDeviceId() }, { merge: true });
        alert("✅ Firebase connected and writable (project: " + parseFirebaseConfig().projectId + ").");
    } catch (e) { alert("❌ Firebase test failed: " + e.message + "\n\nCheck the config JSON and Firestore security rules."); }
}

// Shared: apply a pulled payload object to local state + storage
function applyPulledPayload(p) {
    if (p.inventory) isolatedInventory = p.inventory;
    if (p.billHistory) billHistoryData = p.billHistory;
    if (p.purchases) purchaseHistoryData = p.purchases;
    if (p.customerLedger) customerLedgerData = p.customerLedger;
    if (p.vendorLedger) vendorLedgerData = p.vendorLedger;
    if (p.settings) shopSettings = { ...shopSettings, ...p.settings };
    localStorage.setItem('myBusinessInventory', JSON.stringify(isolatedInventory));
    localStorage.setItem('myBusinessBillHistory', JSON.stringify(billHistoryData));
    localStorage.setItem('myBusinessPurchases', JSON.stringify(purchaseHistoryData));
    localStorage.setItem('myBusinessLedger', JSON.stringify(customerLedgerData));
    localStorage.setItem('myVendorLedger', JSON.stringify(vendorLedgerData));
    localStorage.setItem('myBusinessSettings', JSON.stringify(shopSettings));
}

// Per-purchase push to the Sheet (so Purchases tab is real-time too, with license code)
async function pushPurchaseToCloud(purchase) {
    const p = shopSettings.cloudProvider || 'sheets';
    if (p === 'sheets' || p === 'both') {
        const url = shopSettings.cloudUrl ? shopSettings.cloudUrl.trim() : '';
        if (url) { try { await fetch(url, { method: 'POST', redirect: 'follow', body: JSON.stringify({ action: 'purchase', license: licenseState.key, deviceId: getDeviceId(), purchase }) }); } catch (e) { console.warn("purchase push:", e); } }
    }
    if (p === 'firebase' || p === 'both') firebaseSyncAll(true);
}

// ==========================================
// 16. UPI "SCAN TO PAY" QR ON INVOICE
// ==========================================
function buildUpiString(amount, note) {
    const pa = (shopSettings.upiId || '').trim();
    if (!pa) return '';
    const pn = encodeURIComponent((shopSettings.upiName || shopSettings.shopName || 'Merchant').trim());
    const am = (parseFloat(amount) || 0).toFixed(2);
    const tn = encodeURIComponent((note || 'Invoice').trim());
    return `upi://pay?pa=${encodeURIComponent(pa)}&pn=${pn}&am=${am}&cu=INR&tn=${tn}`;
}

function qrSvg(text, cell) {
    try {
        if (typeof qrcode === 'undefined' || !text) return '';
        const qr = qrcode(0, 'M'); qr.addData(text); qr.make();
        return qr.createSvgTag({ cellSize: cell || 4, margin: 2, scalable: true });
    } catch (e) { console.warn("QR gen failed", e); return ''; }
}

// Refresh the on-screen + popup + print UPI QR for the current grand total
function renderInvoiceQR() {
    const show = (shopSettings.showUpiQr || 'yes') === 'yes' && (shopSettings.upiId || '').trim();
    const gTotalEl = document.getElementById('grandTotal');
    const amount = gTotalEl ? (parseFloat(gTotalEl.innerText) || 0) : 0;
    const invNo = (document.getElementById('invoiceNumber') || {}).innerText || '';
    const upi = buildUpiString(amount, invNo);
    const svg = (show && amount > 0 && upi) ? qrSvg(upi, 4) : '';

    // on-screen (totals box)
    const wrap = document.getElementById('upiQrWrap'), box = document.getElementById('upiQrBox');
    if (wrap && box) {
        if (svg) { box.innerHTML = svg; const a = document.getElementById('upiQrAmt'); if (a) a.innerText = '₹' + amount.toFixed(2); wrap.style.display = 'flex'; }
        else { box.innerHTML = ''; wrap.style.display = 'none'; }
    }
    // checkout popup
    const coWrap = document.getElementById('coUpiQrWrap'), coBox = document.getElementById('coUpiQrBox');
    if (coWrap && coBox) {
        if (svg) { coBox.innerHTML = svg; coWrap.style.display = 'flex'; }
        else { coBox.innerHTML = ''; coWrap.style.display = 'none'; }
    }
    // print
    const pWrap = document.getElementById('pUpiQrWrap'), pBox = document.getElementById('pUpiQrBox');
    if (pWrap && pBox) {
        if (svg) { pBox.innerHTML = svg; pWrap.classList.add('upi-on'); }
        else { pBox.innerHTML = ''; pWrap.classList.remove('upi-on'); }
    }
}

function testUpiId() {
    const id = (document.getElementById('setUpiId') ? document.getElementById('setUpiId').value : '').trim();
    if (!id) return alert("Enter a UPI ID first (e.g. yourname@oksbi).");
    const valid = /^[a-zA-Z0-9.\-_]{2,}@[a-zA-Z]{2,}$/.test(id);
    if (!valid) return alert("⚠️ That doesn't look like a valid UPI ID.\nFormat: username@bank  (e.g. 9876543210@ybl, shop@okhdfcbank)");
    const name = (document.getElementById('setUpiName') ? document.getElementById('setUpiName').value : '') || shopSettings.shopName || 'Merchant';
    const link = `upi://pay?pa=${encodeURIComponent(id)}&pn=${encodeURIComponent(name)}&am=1.00&cu=INR&tn=Test`;
    const svg = qrSvg(link, 5);
    const box = document.getElementById('upiTestBox');
    if (box) {
        box.innerHTML = svg
            ? `✅ Format looks valid. Test QR for a ₹1 payment to <strong>${id}</strong>:<div class="upi-test-qr">${svg}</div><a href="${link}" style="font-size:0.85em;">Open in a UPI app (on phone)</a>`
            : `✅ Format looks valid, but the QR engine didn't load. Reopen the app once while online.`;
        box.style.display = 'block';
    }
}

// ==========================================
// 17. APPLY/SAVE UPI + PROVIDER SETTINGS (extends section 12)
// ==========================================
function applyExtraSettingsToUI() {
    const map = { setCloudProvider: 'cloudProvider', setFirebaseConfig: 'firebaseConfig', setUpiId: 'upiId', setUpiName: 'upiName', setShowUpiQr: 'showUpiQr' };
    Object.entries(map).forEach(([id, key]) => { const el = document.getElementById(id); if (el) el.value = shopSettings[key] || ''; });
    toggleProviderFields();
}
function toggleProviderFields() {
    const p = document.getElementById('setCloudProvider'); if (!p) return;
    const fb = document.getElementById('firebaseFieldsBox'); const sh = document.getElementById('sheetUrlBox');
    if (fb) fb.style.display = (p.value === 'firebase' || p.value === 'both') ? 'flex' : 'none';
    if (sh) sh.style.display = (p.value === 'sheets' || p.value === 'both') ? 'block' : 'none';
}
function saveExtraSettings() {
    const map = { setCloudProvider: 'cloudProvider', setFirebaseConfig: 'firebaseConfig', setUpiId: 'upiId', setUpiName: 'upiName', setShowUpiQr: 'showUpiQr' };
    Object.entries(map).forEach(([id, key]) => { const el = document.getElementById(id); if (el) shopSettings[key] = el.value.trim(); });
    localStorage.setItem('myBusinessSettings', JSON.stringify(shopSettings));
    renderInvoiceQR();
    alert("Saved.");
}

// ==========================================
// 18. FLOATING CHECKOUT POPUP
// ==========================================
function updateCheckoutFab() {
    const fab = document.getElementById('checkoutFab'); if (!fab) return;
    const onBilling = document.getElementById('billing') && document.getElementById('billing').classList.contains('active-view');
    const total = parseFloat((document.getElementById('grandTotal') || {}).innerText) || 0;
    if (onBilling && currentInvoice.length > 0) {
        document.getElementById('fabTotal').innerText = '₹' + total.toFixed(2);
        fab.style.display = 'inline-flex';
    } else { fab.style.display = 'none'; }
}

function openCheckout() {
    if (currentInvoice.length === 0) return alert("Add at least one item to the bill first.");
    const ind = document.getElementById('industrySelector').value;
    const list = document.getElementById('checkoutItems'); list.innerHTML = '';
    currentInvoice.forEach(it => {
        const qtyLabel = ind === 'Jewelry' ? (it.netWt ? it.netWt.toFixed(3) + 'g' : '1') : (it.qty + ' ×');
        list.innerHTML += `<div class="co-item"><span class="co-item-name">${it.name}</span><span class="co-item-qty">${qtyLabel}</span><span class="co-item-amt">₹${(it.total||0).toFixed(2)}</span></div>`;
    });
    document.getElementById('coSubtotal').innerText = (document.getElementById('subtotal') || {}).innerText || '0.00';
    document.getElementById('coGst').innerText = (document.getElementById('totalGst') || {}).innerText || '0.00';
    document.getElementById('coGrand').innerText = (document.getElementById('grandTotal') || {}).innerText || '0.00';
    document.getElementById('coInvNo').innerText = (document.getElementById('invoiceNumber') || {}).innerText || '';
    // sync paid field from the main one
    const mainPaid = document.getElementById('billAmountPaid');
    document.getElementById('coPaid').value = mainPaid ? mainPaid.value : '';
    renderInvoiceQR();               // fills #coUpiQrBox if UPI set
    checkoutPaidChanged();
    document.getElementById('checkoutModal').style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

function checkoutPaidChanged() {
    const co = document.getElementById('coPaid');
    const main = document.getElementById('billAmountPaid');
    if (main) main.value = co.value;          // mirror into the engine's field
    if (typeof calculateDue === 'function') calculateDue();
    const bal = (document.getElementById('billBalanceDue') || {}).innerText || '0.00';
    document.getElementById('coBalance').innerText = bal;
}

function closeCheckout() {
    document.getElementById('checkoutModal').style.display = 'none';
    document.body.style.overflow = '';
}

function checkoutSavePrint() {
    const main = document.getElementById('billAmountPaid');
    if (main) main.value = document.getElementById('coPaid').value;   // ensure latest value
    closeCheckout();
    finalizeAndPrintInvoice();        // existing engine handles save + print + sync
}

// ==========================================
// 19. DASHBOARD — MINIMAL 7-DAY SALES CHART
// ==========================================
function renderSalesChart() {
    const host = document.getElementById('salesChart'); if (!host) return;
    const ind = document.getElementById('industrySelector').value;
    const days = [];
    for (let i = 6; i >= 0; i--) {
        const d = new Date(); d.setHours(0,0,0,0); d.setDate(d.getDate() - i);
        days.push({ key: d.toLocaleDateString('en-IN'), label: d.toLocaleDateString('en-IN', { weekday: 'short' }), total: 0 });
    }
    billHistoryData.filter(b => b.industry === ind || !b.industry).forEach(b => {
        const day = days.find(x => x.key === b.date);
        if (day) day.total += parseFloat(b.grandTotal) || 0;
    });
    const sum7 = days.reduce((a, b) => a + b.total, 0);
    const el = document.getElementById('chartTotal7'); if (el) el.innerText = sum7.toFixed(2);

    const max = Math.max(1, ...days.map(d => d.total));
    const W = 700, H = 180, pad = 28, gap = 16;
    const bw = (W - pad * 2 - gap * 6) / 7;
    let bars = '';
    days.forEach((d, i) => {
        const h = Math.max(2, (d.total / max) * (H - 56));
        const x = pad + i * (bw + gap);
        const y = H - 30 - h;
        const val = d.total >= 1000 ? '₹' + (d.total / 1000).toFixed(1) + 'k' : (d.total > 0 ? '₹' + Math.round(d.total) : '');
        bars += `<rect x="${x}" y="${y}" width="${bw}" height="${h}" rx="6" fill="url(#barGrad)"></rect>`;
        bars += `<text x="${x + bw / 2}" y="${y - 6}" text-anchor="middle" class="cv">${val}</text>`;
        bars += `<text x="${x + bw / 2}" y="${H - 12}" text-anchor="middle" class="cl">${d.label}</text>`;
    });
    host.innerHTML = `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet" class="sc-svg">
        <defs><linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stop-color="var(--primary)"/><stop offset="1" stop-color="var(--primary-hover)"/>
        </linearGradient></defs>
        <line x1="${pad}" y1="${H-30}" x2="${W-pad}" y2="${H-30}" class="cax"/>
        ${bars}
    </svg>`;
}
