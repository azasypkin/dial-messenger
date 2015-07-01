/* global DialReceiver,
          DialSender
*/

(function() {
  var allowedNumbers = [];

  if (allowedNumbers.length === 0) {
    alert('Please add allowed phones numbers in the code!');
    return;
  }

  document.getElementById('send-message').addEventListener('click', () => {
    var message = document.getElementById('message-content');
    var progress = document.getElementById('message-send-progress');

    DialSender.send(allowedNumbers[0], message.value, (left, total) => {
      progress.max = total;
      progress.value = total - left;
    });
  });

  DialReceiver.listen(allowedNumbers, (number, packet) => {
    console.log('Message buffer is %s', [...packet.raw()].join(', '));
    console.log('Message length is %s', packet.getLength());
    console.log('Code content: %s', packet.toBinary().join('----'));

    console.log('String content: %s', packet.toString());

    var messageNode = document.createElement('li');
    messageNode.textContent = packet.toString();

    document.getElementById('messages').appendChild(messageNode);
  });
})(window);