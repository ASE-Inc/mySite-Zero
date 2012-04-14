// Take care of vendor prefixes.
self.postMessage=self.webkitPostMessage||self.postMessage;
addEventListener('message',function(event){
    var xhr=new XMLHttpRequest();
    xhr.open('GET',event.data,false);
    xhr.send();
    postMessage({
        responseText:xhr.responseText,
        readyState:xhr.readyState,
        status:xhr.status,
        url:event.data
    });
    //xhr.addEventListener("progress",onUpdateProgress,false);
},false);
/*function onUpdateProgress(e) { 
    if (e.lengthComputable) { 
        var percent_complete = e.loaded/e.total; 
        document.getElementById("progressMessage").value = Math.round(percentComplete*100) +"% [ " + Math.round(e.loaded / 1000) + " KB ]"; 
    } else { 
        // Length not known, to avoid division by zero 
    } 
}*/
