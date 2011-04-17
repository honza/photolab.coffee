(function($) {

  $(function() {
    
    var socket = new io.Socket('localhost', {
      port: 8000,
      rememberTransport: false
    });
    socket.connect();
    socket.on('connect', function() {
      socket.send('hi!');
    });

    $('a.follow').click(function() {
      var id = $(this).attr('rel');
      $.post('/follow', {id: id}, function(data, st, xhr) {
        if (xhr.status == 200) {
          console.log('success');
          console.log(data);
        } else {
          console.log('error');
        }
      });
      return false;
    });

    $('#send-button').click(function() {
      var t = $('#send-text').val();
      socket.send(t);
      $('#send-text').val("");
      return false;
    });

  });

})(jQuery);
