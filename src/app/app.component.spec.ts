import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { AppComponent } from './app.component';

describe('Weather queries', () => {
  let app: AppComponent;
  let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [AppComponent], providers: [provideHttpClient(), provideHttpClientTesting()] });
    localStorage.removeItem('weather_fav_list');
    app = TestBed.createComponent(AppComponent).componentInstance;
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());
  it('ends loading and offers retry when the API fails', () => {
    app.fetchWeatherData('高雄市');
    expect(app.isLoading()).toBeTrue();
    http.expectOne(r => r.url.includes('F-D0047-065')).flush('offline', { status: 503, statusText: 'Unavailable' });
    expect(app.isLoading()).toBeFalse();
    expect(app.loadError()).toContain('重試');
    app.fetchWeatherData('高雄市');
    http.expectOne(r => r.url.includes('F-D0047-065')).flush({ records: { Locations: [{ Location: [{ LocationName: '鼓山區' }] }] } });
    expect(app.loadError()).toBe('');
    expect(app.rawLocations().length).toBe(1);
  });
  it('cancels previous requests when changing city', () => {
    app.fetchWeatherData('高雄市');
    const old = http.expectOne(r => r.url.includes('F-D0047-065'));
    app.fetchWeatherData('臺北市');
    expect(old.cancelled).toBeTrue();
    http.expectOne(r => r.url.includes('F-D0047-061')).flush({ records: { Locations: [{ Location: [{ LocationName: '中正區' }] }] } });
    expect(app.rawLocations()[0].LocationName).toBe('中正區');
  });
  it('handles empty and malformed responses', () => {
    app.fetchWeatherData('高雄市');
    http.expectOne(() => true).flush({ records: {} });
    expect(app.loadError()).toContain('沒有可用');
    expect(app.isLoading()).toBeFalse();
  });
  it('matches three-hour rain intervals by time rather than array index', () => {
    const slots = [
      { StartTime: '2026-11-04T09:00:00+08:00', EndTime: '2026-11-04T12:00:00+08:00', value: 20 },
      { StartTime: '2026-11-04T12:00:00+08:00', EndTime: '2026-11-04T15:00:00+08:00', value: 80 }
    ];
    expect((app as any).slotAt(slots, '2026-11-04T11:00:00+08:00').value).toBe(20);
    expect((app as any).slotAt(slots, '2026-11-04T12:00:00+08:00').value).toBe(80);
    expect((app as any).slotAt(slots, '2026-11-04T16:00:00+08:00', false)).toBeUndefined();
  });
  it('formats forecast ranges across midnight', () => {
    expect((app as any).formatTimeRange('2026-11-04T23:00:00+08:00', '2026-11-05T02:00:00+08:00')).toBe('11/04 23:00 ～ 11/05 02:00');
  });
  it('does not mistake wind direction or forecast descriptions for other metrics', () => {
    expect((app as any).findMatchingElement([{ ElementName: 'WD' }], 'WS')).toBeUndefined();
    expect((app as any).findMatchingElement([{ ElementName: '天氣預報綜合描述' }, { ElementName: '天氣現象' }], 'Wx').ElementName).toBe('天氣現象');
  });
  it('ignores corrupted favorite storage', () => {
    localStorage.setItem('weather_fav_list', '{"invalid":true}');
    expect((app as any).loadFavorites()).toEqual([]);
    localStorage.removeItem('weather_fav_list');
  });
  it('keeps zero temperature and recommends warm clothing in cold weather', () => {
    const now = new Date().toISOString();
    app.rawLocations.set([{ LocationName: '測試區', WeatherElement: [{ ElementName: '溫度', Time: [{ DataTime: now, ElementValue: [{ Temperature: '0' }] }] }] }]);
    const summary = app.summaryList()[0];
    expect(summary.temp).toBe('0');
    expect(summary.outfitAdvice).toContain('保暖厚外套');
    expect(summary.pop).toBe('--');
    expect(summary.nextSlots[0].tempNum).toBe(0);
    expect(summary.nextSlots[0].rainAmount).toBe('--');
  });
});
