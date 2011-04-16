$(function () {
     var p;

    $('.discard').click(function () {

        var id = $(this).attr('rel');
        $('#' + id + "-image").fadeOut('normal', function() {
            $(this).hide();
        });
        images.pop(id);
        return false;
    });

    $('a.button').click(function() {
        var action = $(this).attr('rel');
        if (action == 'process') {

            $.get('/process', null, function(r){


            $('#empty').fadeOut('fast', function() {
                $('#empty').remove();
                $('#pictures').append("<div id='progress-div'>" +
                    "<span id='progress'>0</span>%<br>" +
                    "<div id='progress-container'>" +
                    "<div id='progress-bar' style='width:0px'></div>" +
                    "</div></div>");
                p = setInterval(function(){
                    $.get('/progress', null, function(r){
                        if (r === '99'){
                            $('#progress').remove();
                            p.clearInterval();
                        }
                        $('#progress').text(r);
                        $('#progress-bar').css('width', r);
                    });
                }, 500); // interval
            }); // fadeOUt
        }); // get
        } // if process
        return false;
    });

});
