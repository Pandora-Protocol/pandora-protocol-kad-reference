module.exports = {

     marshalNumber(num){

        if (num < 0 || num > Number.MAX_SAFE_INTEGER) throw new Error( "Invalid number");

        const b = Buffer.alloc(8);
        let i, c;

        for (i=0; num >= 0x80; i++){

            c = (num & 0x7f);
            b[i] = c | 0x80;

            num = (num - c) / 0x80;
        }

        b[i] = num;
        i++;

        const b2 = Buffer.alloc(i);
        b.copy(b2, 0, 0, i);
        return b2;
    },

    unmarshalNumber( b, size = 7){

        let r = 0, power = 1, i, byte;

        for (i = 0;  ; i++) {

            if (b.buffer.length < b.offset + 1) throw new Error( "Buffer ended prematurely for varint");

            byte = b.read1Byte();

            r += (byte & 0x7f) * power;
            if ( (byte & 0x80) === 0 )
                break;

            if (i > size) throw new Error("Buffer size is too big",);

            power *= 0x80;

        }

        return r;
    }


}