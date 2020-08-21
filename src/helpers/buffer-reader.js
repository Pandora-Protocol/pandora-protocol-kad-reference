module.exports = class BufferReader {

    static create(buffer){

        if (buffer instanceof BufferReader) return buffer;
        return new BufferReader(buffer)

    }

    constructor(buffer){
        this.buffer = buffer;
        this.length = buffer.length;
        this.offset = 0;
    }


    read(noBytes){

        const output = Buffer.alloc(noBytes);
        this.buffer.copy( output,   0, this.offset,        this.offset += noBytes );

        return output;

    }

    fillZerosAndRead(noZeros, noBytes){

        if (!noZeros && !noBytes) return Buffer.alloc(0);

        const output = Buffer.alloc(noZeros + noBytes);
        this.buffer.copy( output,   noZeros, this.offset,        this.offset += noBytes );

        return output;
    }

    read1Byte(){
        return this.buffer[ this.offset++ ];
    }

    lastByte(){
        return this.buffer[ this.offset ];
    }

    back(offset){
        this.offset -= offset;
    }

    readRemaining(){
        return this.buffer.slice(this.offset);
    }

}