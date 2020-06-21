
	
function UploadFile() {
	
	var FileLengthStr = "FL=";
	var ChecksumStr = "CKSUM=";
	var FileLength;
	var ChecksumStrLength = 12;
	var arr_sent_size = 256;
	var arr_sent_overhead_size = 256 + 10;	// 55,aa,55,aa................CKSM,0d,0a	
	var arr_sent = new Uint8Array(arr_sent_overhead_size);		
	var arr_CheckSum;
	
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
			
			rxMcuStr = "";		
			
			//start sending buffer out
			
			do 
			{
				if (remaining_length > arr_sent_size)
					
				{	
					arr_CheckSum = 0;
					arr_sent[0] = 0x55;
					arr_sent[1] = 0xaa;	
					arr_sent[2] = 0x55;	
					arr_sent[3] = 0xaa;	
					arr_sent[arr_sent_overhead_size-2] = 0x0D;
					arr_sent[arr_sent_overhead_size-1] = 0x0A;					
					
					for (i=0; i < arr_sent_size; ++i )
					{	
							arr_sent[i+4] = val_arr[ buffer_block_ptr * arr_sent_size + i];
							
							arr_CheckSum += arr_sent[i+4];
							arr_CheckSum = arr_CheckSum & 0xffff;					
							
					}
				
					var arr_ChecksumStr = arr_CheckSum.toString(16);		
					arr_sent[arr_sent_overhead_size-6] = arr_ChecksumStr.charCodeAt(0);
					arr_sent[arr_sent_overhead_size-5] = arr_ChecksumStr.charCodeAt(1);	
					arr_sent[arr_sent_overhead_size-4] = arr_ChecksumStr.charCodeAt(2);		
					arr_sent[arr_sent_overhead_size-3] = arr_ChecksumStr.charCodeAt(3);						

				
					buffer_block_ptr++;
					sendNextChunk(arr_sent);
					remaining_length = remaining_length - arr_sent_size;
				
				}
			
				else if ( remaining_length > 0 )
				{
					arr_sent_last_overhead_size = remaining_length + 10;
					
					arr_sent_last = new Uint8Array(arr_sent_last_overhead_size);	
					
					arr_CheckSum = 0;
					arr_sent_last[0] = 0x55;
					arr_sent_last[1] = 0xaa;	
					arr_sent_last[2] = 0x55;	
					arr_sent_last[3] = 0xaa;	
					arr_sent_last[arr_sent_last_overhead_size-2] = 0x0D;
					arr_sent_last[arr_sent_last_overhead_size-1] = 0x0A;					
					
					
					
					
					for (i=0; i < remaining_length ; ++i )
					{	
						arr_sent_last[i+4] = val_arr[ buffer_block_ptr * arr_sent_size + i];
					
					
						arr_CheckSum += arr_sent_last[i+4];
						arr_CheckSum = arr_CheckSum & 0xffff;
												
					}
					
					
					var arr_ChecksumStrLast = arr_CheckSum.toString(16);		
					arr_sent_last[arr_sent_last_overhead_size-6] = arr_ChecksumStrLast.charCodeAt(0);
					arr_sent_last[arr_sent_last_overhead_size-5] = arr_ChecksumStrLast.charCodeAt(1);	
					arr_sent_last[arr_sent_last_overhead_size-4] = arr_ChecksumStrLast.charCodeAt(2);		
					arr_sent_last[arr_sent_last_overhead_size-3] = arr_ChecksumStrLast.charCodeAt(3);					
					
					sendNextChunk(arr_sent_last);	
					remaining_length = 0;	
					await sleep(100);
					window.term_.io.println('\r\nFile sent completed 上传完毕 !');		
					rxMcuStr ="UploadCompleted";	
					arr_sent_last.delete;					
					break;

				}

				var start_time = (new Date).getTime();

				do
				{
					if ( rxMcuStr == "RcvOK" )
						break;
					await sleep(100);
					
				} while ( ( (new Date).getTime() - start_time ) < 10000);	// 10 seconds
				
				if ( rxMcuStr != "RcvOK" )
				{
					window.term_.io.println('\r\nUpload timeout abort 上传超时 !\r\n');
					rxMcuStr ="UploadTimeout";
					break;
				}	
				else
				{
					rxMcuStr ="";
					window.term_.io.println(' Block : ' + buffer_block_ptr + ' sent');
				}
				
				
				
			}	while ( remaining_length > 0 )
			
			
				
			
			
			
			//sendNextChunk(val_arr);
			//nusSendString(val_arr);
			if (rxMcuStr == "UploadCompleted")   
				window.term_.io.println('CheckSum = ' + CheckSum + ' = 0x' + CheckSum.toString(16));	

		} else 
			window.term_.io.println('Not connected to a device yet.');	   

		   
	}
	

	
		
	document.getElementById('UploadFile').value = "";	// clean it, otherwise cannot load the same file again
	

	
	
  
}





   




