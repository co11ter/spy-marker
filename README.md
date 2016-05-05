# spy-marker

Spy marker is lightweight alternative for google analytics.

## Usage

new marker(options);

## Options

    {
        sizeForSend: 50, // data pack size
        url: 'http://localhost/test?param=1', // url for send data
        stepSkip: 10, // save step (for example every 10th will save)
        timeЛKout: 30 * 60 * 1000, // end script length (in mins)
    }