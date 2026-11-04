import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subscription, timeout } from 'rxjs';
import { HttpClientService } from './@services/http-client.service';

export interface FavoriteItem {
  city: string;
  district: string;
}

export interface ChartPoint {
  x: number;
  yTemp: number;
  tempVal: string;
  tempNum: number;
  time: string;
  rainVal: string;
  rainNum: number;
  barX: number;
  barY: number;
  barHeight: number;
  icon: string;
}

export interface HourlySlot {
  time: string;
  temp: string;
  tempNum: number;
  icon: string;
  weather: string;
  pop: string;
  popNum: number;
  rainAmount: string;
  rainNum: number;
}

export interface DistrictSummary {
  name: string;
  weather: string;
  icon: string;
  temp: string;
  pop: string;
  humidity: string;
  wind: string;
  comfortText: string;
  rainAdvice: string;
  outfitAdvice: string;
  themeClass: string;
  nextSlots: HourlySlot[];
  chartPoints: ChartPoint[];
  tempPathD: string;
}

export interface TimeSlot {
  timeRange: string;
  value: string;
  rawNum?: number;
}

export interface DistrictDetail {
  districtName: string;
  elementName: string;
  elementId: string;
  maxVal?: string;
  minVal?: string;
  timeSlots: TimeSlot[];
}

export interface ClimateElementOption {
  id: string;
  name: string;
  mobileName: string;
}

export const CITY_API_MAP: Record<string, string> = {
  '基隆市': 'F-D0047-049',
  '臺北市': 'F-D0047-061',
  '新北市': 'F-D0047-069',
  '桃園市': 'F-D0047-005',
  '新竹市': 'F-D0047-053',
  '新竹縣': 'F-D0047-009',
  '苗栗縣': 'F-D0047-013',
  '臺中市': 'F-D0047-073',
  '彰化縣': 'F-D0047-017',
  '南投縣': 'F-D0047-021',
  '雲林縣': 'F-D0047-025',
  '嘉義市': 'F-D0047-057',
  '嘉義縣': 'F-D0047-029',
  '臺南市': 'F-D0047-077',
  '高雄市': 'F-D0047-065',
  '屏東縣': 'F-D0047-033',
  '宜蘭縣': 'F-D0047-001',
  '花蓮縣': 'F-D0047-041',
  '臺東縣': 'F-D0047-037',
  '澎湖縣': 'F-D0047-045',
  '金門縣': 'F-D0047-085',
  '連江縣': 'F-D0047-081'
};

export const CLIMATE_OPTIONS: ClimateElementOption[] = [
  { id: 'ALL', name: '✨ 綜合概況', mobileName: '綜合概況' },
  { id: 'CI', name: '🧘 舒適度指數', mobileName: '舒適度' },
  { id: 'AT', name: '🔥 體感溫度', mobileName: '體感溫度' },
  { id: 'T', name: '🌡️ 溫度', mobileName: '溫度' },
  { id: 'PoP', name: '💧 降雨機率', mobileName: '降雨機率' },
  { id: 'RH', name: '💦 相對濕度', mobileName: '相對濕度' },
  { id: 'WS', name: '🌬️ 風速風向', mobileName: '風速風向' },
  { id: 'Td', name: '🧊 露點溫度', mobileName: '露點溫度' },
  { id: 'DESC', name: '📝 預報綜合描述', mobileName: '預報描述' }
];

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, FormsModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent implements OnInit {
  title = 'weather';
  isLoading = signal(false);
  loadError = signal('');
  updatedAt = signal('');
  private weatherRequest?: Subscription;

  httpsClientService = inject(HttpClientService);

  cityList = Object.keys(CITY_API_MAP);
  selectedCity = signal<string>('高雄市');

  rawLocations = signal<any[]>([]);

  selectedDistrictName = signal<string>('ALL');
  selectedElement = signal<string>('ALL');

  // ✨ GPS 定位載入狀態
  isLocating = signal<boolean>(false);

  // LocalStorage 我的最愛
  favorites = signal<FavoriteItem[]>(this.loadFavorites());

  climateOptions = CLIMATE_OPTIONS;

  private loadFavorites(): FavoriteItem[] {
    try {
      const saved = localStorage.getItem('weather_fav_list');
      const items: unknown = saved ? JSON.parse(saved) : [];
      return Array.isArray(items) ? items.filter((f: any) =>
        f && typeof f.city === 'string' && CITY_API_MAP[f.city] &&
        typeof f.district === 'string' && f.district.length > 0) : [];
    } catch {
      return [];
    }
  }

  isFavorite(cityName: string, districtName: string): boolean {
    return this.favorites().some(f => f.city === cityName && f.district === districtName);
  }

  toggleFavorite(cityName: string, districtName: string, event?: Event): void {
    if (event) {
      event.stopPropagation();
    }

    const current = this.favorites();
    const exists = this.isFavorite(cityName, districtName);

    let updated: FavoriteItem[];
    if (exists) {
      updated = current.filter(f => !(f.city === cityName && f.district === districtName));
    } else {
      updated = [...current, { city: cityName, district: districtName }];
    }

    this.favorites.set(updated);
    try {
      localStorage.setItem('weather_fav_list', JSON.stringify(updated));
    } catch { /* Favorites remain usable in memory when storage is unavailable. */ }
  }

  selectFavorite(fav: FavoriteItem): void {
    if (this.selectedCity() !== fav.city) {
      this.selectedCity.set(fav.city);
      this.fetchWeatherData(fav.city, fav.district);
    } else {
      this.selectedDistrictName.set(fav.district);
    }
  }

  // 📍 GPS 定位核心邏輯
  locateUser(): void {
    if (!navigator.geolocation) {
      alert('您的瀏覽器不支援 GPS 地理定位功能。');
      return;
    }

    this.isLocating.set(true);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;

        const reverseUrl = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=14&addressdetails=1`;

        this.httpsClientService.getApi(reverseUrl).pipe(timeout(15000)).subscribe({
          next: (res: any) => {
            this.isLocating.set(false);
            const address = res?.address || {};

            const rawCity = address.city || address.county || address.state || '';
            const rawDistrict = address.town || address.suburb || address.district || address.city_district || '';

            const matchedCity = this.matchCityName(rawCity);

            if (matchedCity) {
              this.selectedCity.set(matchedCity);

              this.fetchWeatherData(matchedCity, rawDistrict || 'ALL');
            } else {
              alert('定位成功，但未能匹配到台灣對應的縣市資料。');
            }
          },
          error: (err) => {
            this.isLocating.set(false);
            console.error('反向定位失敗：', err);
            alert('定位服務連線逾時，請稍後再試。');
          }
        });
      },
      (err) => {
        this.isLocating.set(false);
        if (err.code === err.PERMISSION_DENIED) {
          alert('請允許瀏覽器存取位置權限以使用 GPS 自動定位功能。');
        } else {
          alert('GPS 定位失敗，請確認已開啟裝置的位置存取服務。');
        }
      },
      { timeout: 10000 }
    );
  }

  private matchCityName(rawCity: string): string | null {
    if (!rawCity) return null;
    const cleanRaw = rawCity.replace('台', '臺');
    for (const city of Object.keys(CITY_API_MAP)) {
      const cleanCity = city.replace('台', '臺');
      if (cleanRaw.includes(cleanCity.replace('市', '').replace('縣', '')) || cleanCity.includes(cleanRaw.replace('市', '').replace('縣', ''))) {
        return city;
      }
    }
    return null;
  }

  summaryList = computed<DistrictSummary[]>(() => {
    const locations = this.rawLocations();
    const selectedDist = this.selectedDistrictName();

    const filtered = selectedDist === 'ALL'
      ? locations
      : locations.filter((loc: any) => (loc.LocationName || loc.locationName) === selectedDist);

    const now = new Date();

    return filtered.map((district: any) => {
      const name = district.LocationName || district.locationName || '未知區域';
      const elements = district.WeatherElement || district.weatherElement || [];

      const weatherVal = this.extractElementValue(elements, 'Wx');
      const tempVal = this.extractElementValue(elements, 'T');
      const popVal = this.extractElementValue(elements, 'PoP');
      const rhVal = this.extractElementValue(elements, 'RH');
      const wsVal = this.extractElementValue(elements, 'WS');
      const wdVal = this.extractElementValue(elements, 'WD');
      const ciVal = this.extractElementValue(elements, 'CI');

      const popNum = Number(popVal) || 0;
      const tempNum = tempVal === '' ? NaN : Number(tempVal);
      const ciNum = ciVal === '' ? NaN : Number(ciVal);

      const rainAdvice = !popVal ? '降雨機率暫無資料' : popNum >= 30 ? '🌂 降雨機率高，建議隨身攜帶雨具' : '☀️ 降雨機率低，可安排戶外活動';

      let outfitAdvice = Number.isFinite(tempNum) ? '👕 穿搭：舒適短袖' : '氣溫暫無資料';
      if (tempNum >= 30) outfitAdvice = '👕 穿搭：清涼透氣短袖，記得注意防曬補充水分';
      else if (tempNum <= 15) outfitAdvice = '🧥 穿搭：天氣寒冷，請準備保暖厚外套';
      else if (tempNum <= 20) outfitAdvice = '🧥 穿搭：氣溫偏涼，建議搭配薄外套';

      const themeClass = this.getWeatherThemeClass(weatherVal);

      const tElem = this.findMatchingElement(elements, 'T');
      const wxElem = this.findMatchingElement(elements, 'Wx');
      const popElem = this.findMatchingElement(elements, 'PoP');

      const times = tElem?.Time || tElem?.time || [];
      const wxTimes = wxElem?.Time || wxElem?.time || [];
      const popTimes = popElem?.Time || popElem?.time || [];

      const futureIndices: number[] = [];
      times.forEach((tItem: any, idx: number) => {
        const startTime = tItem.StartTime || tItem.startTime || tItem.DataTime || tItem.dataTime || '';
        if (startTime) {
          const slotTime = new Date(startTime);
          if (slotTime.getTime() + 3600000 >= now.getTime()) {
            futureIndices.push(idx);
          }
        } else {
          futureIndices.push(idx);
        }
      });

      const targetIndices = futureIndices.slice(0, 6);

      const nextSlots: HourlySlot[] = targetIndices.map((idx: number) => {
        const tItem = times[idx] || {};
        const startTime = tItem.StartTime || tItem.startTime || tItem.DataTime || tItem.dataTime || '';

        const tVals = tItem.ElementValue || tItem.elementValue || [];
        let tVal = '--';
        if (tVals.length > 0) {
          const first = tVals[0];
          tVal = typeof first === 'string'
            ? first
            : (first.value || first.Value || first.Temperature || (Object.values(first)[0] as string) || '--');
        }

        const wxItem = this.slotAt(wxTimes, startTime, false);
        const wxVals = wxItem?.ElementValue || wxItem?.elementValue || [];
        let wxVal = '';
        if (wxVals.length > 0) {
          const first = wxVals[0];
          wxVal = typeof first === 'string'
            ? first
            : (first.value || first.Value || first.Weather || (Object.values(first)[0] as string) || '');
        }

        const popItem = this.slotAt(popTimes, startTime, false);
        const popVals = popItem?.ElementValue || popItem?.elementValue || [];
        let pVal = '--';
        if (popVals.length > 0) {
          const first = popVals[0];
          const pStr = typeof first === 'string' ? first : (first.value || first.Value || (Object.values(first)[0] as string) || '0');
          pVal = Number.isFinite(parseFloat(pStr)) && parseFloat(pStr) >= 0 ? `${parseFloat(pStr)}%` : '--';
        }

        const d = new Date(startTime);
        const timeStr = isNaN(d.getTime()) ? `時段${idx+1}` : `${d.getHours().toString().padStart(2, '0')}:00`;

        const parsedTemp = Number.isFinite(parseFloat(tVal)) ? parseFloat(tVal) : NaN;
        const parsedPop = parseFloat(pVal) || 0;

        // Plot the supplied probability; probability cannot determine rain volume.
        const rainNum = parsedPop;

        return {
          time: timeStr,
          temp: `${tVal}°C`,
          tempNum: parsedTemp,
          icon: this.getWeatherIcon(wxVal),
          weather: wxVal,
          pop: pVal,
          popNum: parsedPop,
          rainAmount: pVal,
          rainNum
        };
      }).filter(slot => Number.isFinite(slot.tempNum));

      const tempNums = nextSlots.map(s => s.tempNum);
      let minTemp = Math.min(...tempNums);
      let maxTemp = Math.max(...tempNums);
      if (minTemp === maxTemp) {
        minTemp -= 2;
        maxTemp += 2;
      }

      const rainNums = nextSlots.map(s => s.rainNum);
      const maxRain = 100;

      const count = nextSlots.length;
      const chartPoints: ChartPoint[] = nextSlots.map((slot, i) => {
        const x = count > 1 ? 45 + (i * (410 / (count - 1))) : 250;
        const yTemp = 105 - ((slot.tempNum - minTemp) / (maxTemp - minTemp)) * 55;

        const barHeight = Math.max(0, (slot.rainNum / maxRain) * 45);
        const barY = 150 - barHeight;
        const barX = x - 12;

        return {
          x,
          yTemp,
          tempVal: slot.temp,
          tempNum: slot.tempNum,
          time: slot.time,
          rainVal: slot.rainAmount,
          rainNum: slot.rainNum,
          barX,
          barY,
          barHeight,
          icon: slot.icon
        };
      });

      const tempPathD = chartPoints.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x} ${p.yTemp}`).join(' ');
      const fullWindStr = wdVal ? `${wdVal} ${wsVal} m/s` : `${wsVal || '--'} m/s`;

      return {
        name,
        weather: weatherVal || '無資料',
        icon: this.getWeatherIcon(weatherVal),
        temp: tempVal || '--',
        pop: popVal ? `${popVal}%` : '--',
        humidity: rhVal ? `${rhVal}%` : '--',
        wind: fullWindStr,
        comfortText: Number.isFinite(ciNum) ? this.getComfortText(ciNum) : '--',
        rainAdvice,
        outfitAdvice,
        themeClass,
        nextSlots,
        chartPoints,
        tempPathD
      };
    });
  });

  detailList = computed<DistrictDetail[]>(() => {
    const currentElemId = this.selectedElement();
    if (currentElemId === 'ALL') return [];

    const option = this.climateOptions.find(opt => opt.id === currentElemId);
    if (!option) return [];

    const locations = this.rawLocations();
    const selectedDist = this.selectedDistrictName();

    const filtered = selectedDist === 'ALL'
      ? locations
      : locations.filter((loc: any) => (loc.LocationName || loc.locationName) === selectedDist);

    return filtered.map((district: any) => {
      const distName = district.LocationName || district.locationName || '未知區域';
      const elements = district.WeatherElement || district.weatherElement || [];

      const timeSlots: TimeSlot[] = [];
      const numValues: number[] = [];

      if (currentElemId === 'WS') {
        const wsElem = this.findMatchingElement(elements, 'WS');
        const wdElem = elements.find((e: any) => {
          const elName = (e.ElementName || e.elementName || '').trim().toLowerCase();
          return elName === 'wd' || elName.includes('風向');
        });

        const times = wsElem?.Time || wsElem?.time || [];
        const wdTimes = wdElem?.Time || wdElem?.time || [];

        times.forEach((t: any, idx: number) => {
          const startTime = t.StartTime || t.startTime || t.DataTime || t.dataTime || '';
          const endTime = t.EndTime || t.endTime || '';

          const wsVals = t.ElementValue || t.elementValue || [];
          let wsStr = '';
          if (wsVals.length > 0) {
            const first = wsVals[0];
            wsStr = typeof first === 'string' ? first : (first.value || first.Value || Object.values(first)[0] || '');
          }

          const wdItem = this.slotAt(wdTimes, startTime);
          const wdVals = wdItem?.ElementValue || wdItem?.elementValue || [];
          let wdStr = '';
          if (wdVals.length > 0) {
            const first = wdVals[0];
            wdStr = typeof first === 'string' ? first : (first.value || first.Value || Object.values(first)[0] || '');
          }

          const parsed = parseFloat(wsStr);
          if (!isNaN(parsed)) numValues.push(parsed);

          let displayVal = '無資料';
          if (wdStr && wsStr) {
            displayVal = `${wdStr} ${wsStr} m/s`;
          } else if (wsStr) {
            displayVal = `${wsStr} m/s`;
          } else if (wdStr) {
            displayVal = wdStr;
          }

          timeSlots.push({
            timeRange: this.formatTimeRange(startTime, endTime),
            value: displayVal,
            rawNum: parsed
          });
        });
      } else {
        const matchedElem = this.findMatchingElement(elements, currentElemId);

        if (matchedElem) {
          const times = matchedElem.Time || matchedElem.time || [];
          times.forEach((t: any) => {
            const startTime = t.StartTime || t.startTime || t.DataTime || t.dataTime || '';
            const endTime = t.EndTime || t.endTime || '';
            const elementValues = t.ElementValue || t.elementValue || [];

            let valStr = '';
            let rawNum: number | undefined = undefined;

            if (elementValues.length > 0) {
              const first = elementValues[0];
              valStr = typeof first === 'string'
                ? first
                : (first.value || first.Value || first.ComfortIndex || Object.values(first)[0] || '');

              const parsed = parseFloat(valStr);
              if (!isNaN(parsed)) {
                rawNum = parsed;
                numValues.push(parsed);
              }

              if (elementValues[1]) {
                const secondVal = elementValues[1].value || elementValues[1].Value || '';
                if (secondVal && secondVal !== valStr) {
                  valStr += ` (${secondVal})`;
                }
              }
            }

            if (currentElemId === 'CI' && rawNum !== undefined) {
              valStr = `${rawNum} (${this.getComfortText(rawNum)})`;
            }

            if (['AT', 'T', 'Td'].includes(currentElemId) && rawNum !== undefined) {
              valStr = `${rawNum} °C`;
            }

            if (['PoP', 'RH'].includes(currentElemId) && rawNum !== undefined) {
              valStr = `${rawNum} %`;
            }

            timeSlots.push({
              timeRange: this.formatTimeRange(startTime, endTime),
              value: valStr || '無資料',
              rawNum
            });
          });
        }
      }

      let maxVal: string | undefined = undefined;
      let minVal: string | undefined = undefined;

      if (numValues.length > 0) {
        const max = Math.max(...numValues);
        const min = Math.min(...numValues);

        if (['AT', 'T', 'Td'].includes(currentElemId)) {
          maxVal = `${max} °C`;
          minVal = `${min} °C`;
        } else if (['PoP', 'RH'].includes(currentElemId)) {
          maxVal = `${max} %`;
          minVal = `${min} %`;
        } else if (currentElemId === 'WS') {
          maxVal = `${max} m/s`;
          minVal = `${min} m/s`;
        } else if (currentElemId === 'CI') {
          maxVal = `${max} (${this.getComfortText(max)})`;
          minVal = `${min} (${this.getComfortText(min)})`;
        } else {
          maxVal = `${max}`;
          minVal = `${min}`;
        }
      }

      return {
        districtName: distName,
        elementName: option.name,
        elementId: currentElemId,
        maxVal,
        minVal,
        timeSlots
      };
    });
  });

  ngOnInit(): void {
    this.fetchWeatherData(this.selectedCity());
  }

  fetchWeatherData(cityName: string, targetDistrict: string = 'ALL'): void {
    const apiCode = CITY_API_MAP[cityName];
    if (!apiCode) return;

    const url = `/api/weather?dataset=${apiCode}`;

    this.weatherRequest?.unsubscribe();
    this.rawLocations.set([]);
    this.selectedDistrictName.set('ALL');
    this.isLoading.set(true);
    this.loadError.set('');
    this.updatedAt.set('');
    this.weatherRequest = this.httpsClientService.getApi(url).pipe(timeout(15000)).subscribe({
      next: (res: any) => {
        const raw = res?.records?.Locations?.[0]?.Location ?? res?.records?.locations?.[0]?.location;
        this.isLoading.set(false);
        if (!Array.isArray(raw) || raw.length === 0) {
          this.loadError.set('目前沒有可用的預報資料，請稍後重試。');
          return;
        }
        this.rawLocations.set(raw);
        const normalize = (value: string) => value.replace(/台/g, '臺');
        const district = raw.find((d: any) => normalize(d.LocationName || d.locationName || '') === normalize(targetDistrict));
        this.selectedDistrictName.set(district ? (district.LocationName || district.locationName) : 'ALL');
        this.updatedAt.set(new Date().toLocaleTimeString('zh-TW', { timeZone: 'Asia/Taipei', hour: '2-digit', minute: '2-digit' }));
      },
      error: () => {
        this.isLoading.set(false);
        this.loadError.set('天氣資料讀取失敗，請確認網路連線後重試。');
      }
    });
  }

  private slotAt(times: any[], timestamp: string, allowFuture = true): any {
    const target = new Date(timestamp).getTime();
    if (!Number.isFinite(target)) return undefined;
    const start = (t: any) => new Date(t.StartTime || t.startTime || t.DataTime || t.dataTime || '').getTime();
    const active = times.find(t => start(t) <= target && target < new Date(t.EndTime || t.endTime || '').getTime());
    if (active) return active;
    const previous = times.filter(t => !(t.EndTime || t.endTime) && start(t) <= target).at(-1);
    if (previous && target - start(previous) < 3 * 3600000) return previous;
    return allowFuture ? times.find(t => start(t) >= target) : undefined;
  }

  onCitySelect(event: Event): void {
    const target = event.target as HTMLSelectElement;
    const city = target.value;
    this.selectedCity.set(city);
    this.fetchWeatherData(city);
  }

  onDistrictSelect(event: Event): void {
    const target = event.target as HTMLSelectElement;
    this.selectedDistrictName.set(target.value);
  }

  onElementSelect(elemId: string): void {
    this.selectedElement.set(elemId);
  }

  selectDistrict(districtName: string): void {
    this.selectedDistrictName.set(districtName);
  }

  private getWeatherThemeClass(weatherText: string): string {
    if (!weatherText) return 'theme-sunny';
    if (weatherText.includes('雷')) return 'theme-thunder';
    if (weatherText.includes('雨')) return 'theme-rainy';
    if (weatherText.includes('陰')) return 'theme-overcast';
    if (weatherText.includes('多雲')) return 'theme-cloudy';
    if (weatherText.includes('晴')) return 'theme-sunny';
    return 'theme-sunny';
  }

  private findMatchingElement(elements: any[], optionId: string): any {
    if (!elements || !Array.isArray(elements)) return null;

    return elements.find(e => {
      const elName = (e.ElementName || e.elementName || '').trim();
      const elLower = elName.toLowerCase();

      switch (optionId) {
        case 'CI':
          return elLower === 'ci' || elName.includes('舒適度');
        case 'AT':
          return elLower === 'at' || elName.includes('體感');
        case 'T':
          if (elName.includes('體感') || elName.includes('露點')) return false;
          return elLower === 't' || elName.includes('溫度');
        case 'PoP':
          return elLower.includes('pop') || elName.includes('降雨');
        case 'RH':
          return elLower === 'rh' || elName.includes('濕度');
        case 'WS':
          return elLower === 'ws' || elName.includes('風速');
        case 'WD':
          return elLower === 'wd' || elName.includes('風向');
        case 'Td':
          return elLower === 'td' || elName.includes('露點');
        case 'Wx':
          return elLower === 'wx' || elName === '天氣現象';
        case 'DESC':
          return elLower.includes('description') || elName.includes('描述');
        default:
          return false;
      }
    });
  }

  private extractElementValue(elements: any[], optionId: string): string {
    const matched = this.findMatchingElement(elements, optionId);
    if (!matched) return '';

    const times = matched.Time || matched.time || [];
    if (!times || times.length === 0) return '';

    const firstTime = this.slotAt(times, new Date().toISOString());
    if (!firstTime) return '';
    const elementValue = firstTime.ElementValue || firstTime.elementValue || [];
    if (!elementValue || elementValue.length === 0) return '';

    const firstVal = elementValue[0];
    if (typeof firstVal === 'string') return firstVal;
    const value = String(firstVal.value ?? firstVal.Value ?? Object.values(firstVal)[0] ?? '');
    return value === '-99' || value === '-' ? '' : value;
  }

  private getWeatherIcon(weatherInput: any): string {
    if (!weatherInput) return '🌤️';

    let weatherText = '';
    if (typeof weatherInput === 'string') {
      weatherText = weatherInput;
    } else if (typeof weatherInput === 'object') {
      weatherText = weatherInput.value || weatherInput.Value || weatherInput.parameterName || '';
    } else {
      weatherText = String(weatherInput);
    }

    if (weatherText.includes('雷')) return '⛈️';
    if (weatherText.includes('雨')) return '🌧️';
    if (weatherText.includes('陰')) return '☁️';
    if (weatherText.includes('多雲') && weatherText.includes('晴')) return '🌤️';
    if (weatherText.includes('多雲')) return '⛅';
    if (weatherText.includes('晴')) return '☀️';
    return '🌤️';
  }

  private formatTimeRange(start: string, end: string): string {
    if (!start) return '近期預報';
    const s = new Date(start);
    const month = (s.getMonth() + 1).toString().padStart(2, '0');
    const date = s.getDate().toString().padStart(2, '0');
    const sHour = s.getHours().toString().padStart(2, '0');

    if (!end) return `${month}/${date} ${sHour}:00`;

    const e = new Date(end);
    const eHour = e.getHours().toString().padStart(2, '0');

    const endDate = `${(e.getMonth() + 1).toString().padStart(2, '0')}/${e.getDate().toString().padStart(2, '0')}`;
    return `${month}/${date} ${sHour}:00 ～ ${endDate} ${eHour}:00`;
  }

  private getComfortText(ci: number): string {
    if (ci <= 10) return '非常寒冷';
    if (ci <= 15) return '寒冷';
    if (ci <= 19) return '稍有寒意';
    if (ci <= 26) return '舒適';
    if (ci <= 30) return '悶熱';
    return '極悶熱';
  }
}
