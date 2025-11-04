import * as fs from 'fs';
import * as path from 'path';

export class KeywordMatcher {
  private keywords: string[] = [];
  private keywordsFile: string;

  constructor(keywordsFile: string = 'keywords.txt') {
    this.keywordsFile = keywordsFile;
    this.loadKeywords();
    
    fs.watchFile(this.keywordsFile, () => {
      console.log('Keywords file changed, reloading...');
      this.loadKeywords();
    });
  }

  private loadKeywords(): void {
    try {
      const filePath = path.resolve(this.keywordsFile);
      if (!fs.existsSync(filePath)) {
        console.warn(`Keywords file not found: ${filePath}. Creating empty file.`);
        fs.writeFileSync(filePath, '', 'utf-8');
        this.keywords = [];
        return;
      }

      const content = fs.readFileSync(filePath, 'utf-8');
      this.keywords = content
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0 && !line.startsWith('#'));
      
      console.log(`Loaded ${this.keywords.length} keywords from ${filePath}`);
    } catch (error) {
      console.error('Error loading keywords file:', error);
      this.keywords = [];
    }
  }

  matches(name: string, ticker: string): boolean {
    const searchText = `${name} ${ticker}`.toLowerCase();
    const nameLower = name.toLowerCase();
    const tickerLower = ticker.toLowerCase();
    
    if (nameLower === 'z' || tickerLower === 'z') {
      console.log(`Match found: "Z" as standalone name "${name}" or ticker "${ticker}"`);
      return true;
    }
    
    for (const keyword of this.keywords) {
      if (searchText.includes(keyword.toLowerCase())) {
        console.log(`Match found: "${keyword}" in name "${name}" or ticker "${ticker}"`);
        return true;
      }
    }
    
    return false;
  }

  getKeywords(): string[] {
    return [...this.keywords];
  }
}

