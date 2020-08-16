const { GyappUtils } = require('./utils');

describe('GyappUtils', () => {
  describe('getDeviceID()', () => {
    it('should be return string', () => {
      expect(GyappUtils.getDeviceID()).not.toBe(null);
    })
  })
  describe('getTmpFilePath()', () => {
    it('should be return string', () => {
      const utils = new GyappUtils({
        url: 'https://google.com',
      });
      expect(utils.getTmpFilePath()).toEqual(expect.stringContaining('https___google_com.png'))
    })
  })
})