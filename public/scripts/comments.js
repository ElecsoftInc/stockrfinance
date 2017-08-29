$(document).ready(()=> {
  console.log("HEEELOO")
  var dateString = Date.now()
  var actualDate = new Date(dateString).toDateString()

  $('#postComment').on('submit', function(e){

    e.preventDefault();
    console.log('e',e);
    console.log('req.params', window.location.href.split('/'))
    var urlSplit = window.location.href.split('/');
    var id = urlSplit[4];
    console.log('id', id)
    console.log('window object', window.sessionStorage)

    $.ajax({
      url: '/postComment',
      type: 'POST',
      data: {
        text: $('#textarea').val(),
        date: actualDate,
        article_id: id
      }
    }).done((fromServer)=> {

      console.log('response', JSON.parse(fromServer));
      var comment = `<article class="media">
                      <div class="media-content">
                        <div class="content">
                          <p>
                            <strong id="commenterName">${JSON.parse(fromServer).commenterName}</strong>
                            <br id="commentText">
                            ${$('#textarea').val()}
                            <br>
                            <small id="commentTime">${actualDate}</small>
                          </p>
                        </div>
                      </div>
                    </article>`;

      $('#commentGoesHere').prepend(comment)

      $('#textarea').val('')
    })
  })
})
