
	
function UploadFile() {
	
	var FileLengthStr = "FL=";
	var ChecksumStr = "CKSUM=";
	var FileLength;
	var ChecksumStrLength = 12;
	var arr_sent_size = 5000;
	var arr_sent = new Uint8Array(arr_sent_size);	
	
	var fr;
	// turn echo off to avoid terminal buffer crash
	if  ( fTxEchoToggle )
		TxEchoToggle();

	var UploadFile= document.getElementById('UploadFile').files[0];

	if(UploadFile)
	{
		window.term_.io.println('\r\n' + '"' + UploadFile.name + '"' + ' is loaded. File size is = ' + UploadFile.size + ' bytes' );	
		
		FileLength = UploadFile.size;
		PrepareFileLengthString();

		
            fr = new FileReader();
			
            fr.onload = receivedBinary;
            fr.readAsBinaryString(UploadFile);
	}
	
	
	function PrepareFileLengthString() {
		FileLength = UploadFile.size;
		FileLengthStr=FileLengthStr.concat(FileLength.toString());
		FileLengthStr=FileLengthStr.concat("\r\n");	
	}
	
	function PrepareChecksumString() {
		
		ChecksumStr=ChecksumStr.concat(CheckSum.toString(16));
		ChecksumStr=ChecksumStr.concat("\r\n");	

	}
	
	function sleep(ms) {
		return new Promise(resolve => setTimeout(resolve, ms));
	}
	
	async function receivedBinary() {
		   //alert("Enetr Show Result A");
		var result, n, aByte, byteStr, val_arr;
		
		val_arr_sent = [5000];
		var remaining_length;
		var buffer_block_ptr;
		
		if(bleDevice && bleDevice.gatt.connected) {
			
			result = fr.result;	
			var TotalArrayLength = result.length  + FileLengthStr.length + ChecksumStrLength;			
			//let val_arr = new Uint8Array(result.length + FileLengthStr.length);	
			val_arr = new Uint8Array(TotalArrayLength);	
			
			CheckSum = 0;
		//alert(result.length);
			for (n = 0; n < result.length; ++n) {
				aByte = result.charCodeAt(n);
            //byteStr = aByte.toString(16);
            //if (byteStr.length < 2) {
              //  byteStr = "0" + byteStr;
            //}
				//val_arr[n] = byteStr;
				val_arr[n] = aByte;
				
				CheckSum += aByte;
				CheckSum = CheckSum & 0xffff;
			}

			PrepareChecksumString();
		
			for (n = 0; n < FileLengthStr.length; ++n) {
		
				//val_arr[result.length + n] = FileLengthStr.charAt(n);
				aByte = FileLengthStr.charCodeAt(n);			
				val_arr[result.length + n] = aByte;

			}
			
			for (n = 0; n < ChecksumStrLength; ++n) {
		
				//val_arr[result.length + n] = FileLengthStr.charAt(n);
				aByte = ChecksumStr.charCodeAt(n);			
				val_arr[result.length + FileLengthStr.length + n] = aByte;

			}		
			
			remaining_length = TotalArrayLength
			buffer_block_ptr = 0;
			
		
			while ( remaining_length > arr_sent_size )
			{
				for (i=0; i < arr_sent_size; ++i )
						arr_sent[i] = val_arr[ buffer_block_ptr * arr_sent_size + i];
				
					buffer_block_ptr++;
					sendNextChunk(arr_sent);
					remaining_length = remaining_length - arr_sent_size;
					
					await sleep(5000);
				
			};
			
			if ( remaining_length > 0 )
			{
				arr_sent1 = new Uint8Array(remaining_length);	
				for (i=0; i < remaining_length ; ++i )
						arr_sent1[i] = val_arr[ buffer_block_ptr * arr_sent_size + i];
				sendNextChunk(arr_sent1);					

			}
				
			
			
			
			//sendNextChunk(val_arr);
			//nusSendString(val_arr);
			window.term_.io.println('CheckSum = ' + CheckSum + ' = 0x' + CheckSum.toString(16));	

		} else 
			window.term_.io.println('Not connected to a device yet.');	   

		   
	}
	

	
		
	document.getElementById('UploadFile').value = "";	// clean it, otherwise cannot load the same file again
	

	
	
  
}





   




