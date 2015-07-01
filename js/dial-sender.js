/* global DialPacket,
          Promise
*/
(function(exports) {
  var telephonyManager = navigator.mozTelephony;

  telephonyManager.muted = true;
  telephonyManager.speakerEnabled = false;

  function makeCall(number, duration) {
    return telephonyManager.dial(number, 0).then((call) => {
      return new Promise((resolve, reject) => {
        var alertTimeout;
        call.onalerting = () => {
          console.log('Alerting....');
          alertTimeout = setTimeout(() => {
            alertTimeout = null;
            call.ondisconnected = null;

            call.hangUp().then(
              () => resolve(),
              (e) => {
                console.log('Error while hangUp: %s', e.message || e.name);
                resolve();
              }
            );
          }, duration);
        };

        call.ondisconnected = () => {
          console.log('Disconnected (%s)', call.disconnectedReason);
          clearTimeout(alertTimeout);

          resolve();
        };

        call.onerror = (e) => reject(e);
      });
    });
  }

  function getCallDuration(bits) {
    var timeOutDuration = 0;

    if (!bits[0] && !bits[1]) {
      timeOutDuration = 3000;
    } else if (!bits[0] && bits[1]) {
      timeOutDuration = 6000;
    } else if (bits[0] && !bits[1]) {
      timeOutDuration = 9000;
    } else {
      timeOutDuration = 12000;
    }

    return timeOutDuration;
  }

  exports.DialSender = {
    send(number, message, onProgress) {
      if (!number) {
        return Promise.reject(new Error('Number is not defined!'));
      }

      return new Promise((resolve, reject) => {
        var bits = [...DialPacket.fromString(message || '').raw()];
        var totalBits = bits.length;

        console.log('Going to send %s bits', totalBits);

        (function sendMessage() {
          if (bits.length > 1) {
            var bitsToSend = [bits.shift(), bits.shift()];

            setTimeout(() => {
              console.log('Start sending %s', bitsToSend.join(', '));

              makeCall(number, getCallDuration(bitsToSend)).then(() => {
                onProgress(bits.length, totalBits);

                console.log(
                  'Sent %s to %s, left %s bits',
                  bitsToSend.join(', '), number, bits.length
                );

                sendMessage();
              }, (e) => {
                console.log(
                  'Error during sending %s to %s', bitsToSend.join(', '), number
                );

                reject(e);
              });
            }, 4000);
          } else {
            resolve();
          }
        })();
      });
    }
  };
})(window);