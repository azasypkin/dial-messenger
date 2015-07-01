/* global DialPacket */
(function(exports) {
  var telephonyManager = navigator.mozTelephony;
  var phoneNumberService = navigator.mozPhoneNumberService;

  telephonyManager.muted = true;
  telephonyManager.speakerEnabled = false;

  exports.DialReceiver = {
    listen(numbers, onPacket) {
      var packet = null;
      telephonyManager.addEventListener('incoming', (e) => {
        var normalizedNumber = phoneNumberService.normalize(e.call.id.number);

        console.log('Incoming packet from %s', normalizedNumber);

        if (!numbers.some((number) => normalizedNumber === number)) {
          return;
        }

        if (!packet) {
          packet = new DialPacket();
        }

        packet.startReading().then(() => {
          if (telephonyManager.calls.length > 0) {
            telephonyManager.calls[0].hangUp();
          }
        });

        e.call.ondisconnected = () => {
          packet.stopReading();

          if (packet.isCompleted()) {
            onPacket(normalizedNumber, packet);

            packet = null;
          }
        };
      });
    }
  };
})(window);