$(document).ready(()=> {

  $('#blogForm').on('submit', (e)=> {
    console.log(e)
    e.preventDefault();
    console.log('LOOK HERE', document.getElementById('fileToUpload').files)
    const fileName = document.getElementById('fileToUpload').files;
    const title = $('#Title').val();
    const story = $('#Story').val();
    const file = fileName[0];
    console.log('file', file)
    console.log('fileNAME', fileName)
    if(file == null){
      return alert('No file selected')
    }
    console.log('HELLO')
    getSignedRequest(file, title, story)
    console.log(window.location.host);
    setTimeout(() =>{
      window.location.replace('/blog');
    }, 5000);
  })

  function getSignedRequest(file, title, story){
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `/submitArticle?file-name=${file.name}&file-type=${file.type}&title=${title}&story=${story}`);

    // xhr.onreadystatechange = () => {

    // }
    xhr.send();
  }

})
