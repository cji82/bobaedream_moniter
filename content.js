// 사용자 메모를 저장할 IndexedDB 데이터베이스 생성
let db;
const request = indexedDB.open('bobaeMemoDB', 1);

request.onerror = (event) => {
  console.error('데이터베이스 오류:', event.target.error);
};

request.onsuccess = (event) => {
  db = event.target.result;
  console.log('데이터베이스 연결 성공');
  
  // 데이터베이스 연결 후 즉시 메모 체크
  checkAllMemos();
};

request.onupgradeneeded = (event) => {
  const db = event.target.result;
  const store = db.createObjectStore('memos', { keyPath: 'userId' });
  store.createIndex('memo', 'memo', { unique: false });
};

// CSS 스타일 추가
const style = document.createElement('style');
style.textContent = `
  #submenusel.with-memo {
    height: auto !important;
  }
  .memo-indicator {
    display: inline-block;
    margin-right: 5px;
    cursor: pointer;
    position: relative;
  }
  .memo-indicator .memo-tooltip {
    display: none;
    position: absolute;
    background: #333;
    color: #fff;
    padding: 5px 10px;
    border-radius: 4px;
    font-size: 12px;
    white-space: nowrap;
    z-index: 1000;
    top: -30px;
    left: 50%;
    transform: translateX(-50%);
    box-shadow: 0 2px 5px rgba(0,0,0,0.2);
  }
  .memo-indicator .memo-tooltip::after {
    content: '';
    position: absolute;
    bottom: -5px;
    left: 50%;
    transform: translateX(-50%);
    border-width: 5px 5px 0;
    border-style: solid;
    border-color: #333 transparent transparent;
  }
  .memo-indicator:hover .memo-tooltip {
    display: block;
  }
  .has-memo-title a {
    text-decoration: line-through !important;
  }
  .has-memo-title strong{
    text-decoration: line-through !important;
  }
  .report-button {
    display: inline-block;
    margin-right: 5px;
    cursor: pointer;
    color: #ff0000;
    font-size: 14px;
  }
  .report-button:hover {
    opacity: 0.8;
  }
`;
document.head.appendChild(style);

// 컨텍스트 메뉴에 메모 버튼 추가
function addMemoButton(userId, userName) {
  console.log('메모 버튼 추가 시도:', userId, userName);
  
  const checkMenu = setInterval(() => {
    const menu = document.getElementById('submenusel');
    if (menu) {
      clearInterval(checkMenu);
      console.log('메뉴 찾음:', menu);
      
      const menuList = menu.querySelector('ol');
      if (!menuList) {
        console.log('메뉴 리스트를 찾을 수 없음');
        return;
      }

      // 이미 메모 버튼이 있는지 확인
      if (!menuList.querySelector('.memo-button')) {
        // 기존 메뉴 아이템 저장
        const existingItems = Array.from(menuList.children);
        
        // 메뉴 리스트 초기화 방지
        if (existingItems.length === 3) {
          // 회원차단 메뉴 아이템 생성
          const blockItem = document.createElement('li');
          const blockLink = document.createElement('a');
          blockLink.href = '#';
          blockLink.className = 'submenu_item';
          blockLink.textContent = '회원차단';
          blockLink.onclick = function(e) {
            e.preventDefault();
            if (typeof user_block === 'function') {
              user_block(userId);
            }
          };
          blockItem.appendChild(blockLink);
          menuList.appendChild(blockItem);
        }

        const menuItem = document.createElement('li');
        const memoButton = document.createElement('a');
        memoButton.href = '#';
        memoButton.className = 'submenu_item memo-button';
        memoButton.textContent = '메모하기';
        memoButton.onclick = (e) => {
          e.preventDefault();
          showMemoModal(userId, userName);
        };

        menuItem.appendChild(memoButton);
        menuList.appendChild(menuItem);
        
        // 메뉴가 완전히 표시된 후 클래스 추가
        setTimeout(() => {
          if (menu.style.display === 'block') {
            menu.classList.add('with-memo');
            console.log('메뉴 높이 조정 클래스 추가 완료');
          }
        }, 100);
        
        console.log('메모 버튼 추가 완료');
      }
    }
  }, 100);
}

// 메모 모달 표시
function showMemoModal(userId, userName) {
  const modal = document.createElement('div');
  modal.className = 'memo-modal';
  modal.innerHTML = `
    <div class="memo-modal-content">
      <h3>${userName}님의 메모</h3>
      <textarea id="memoText" placeholder="메모를 입력하세요"></textarea>
      <div class="memo-buttons">
        <button id="saveMemo">저장</button>
        <button id="cancelMemo">취소</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  // 기존 메모 불러오기
  const transaction = db.transaction(['memos'], 'readonly');
  const store = transaction.objectStore('memos');
  const request = store.get(userId);

  request.onsuccess = (event) => {
    if (event.target.result) {
      document.getElementById('memoText').value = event.target.result.memo;
    }
  };

  // 저장 버튼 이벤트
  document.getElementById('saveMemo').onclick = () => {
    const memo = document.getElementById('memoText').value;
    const transaction = db.transaction(['memos'], 'readwrite');
    const store = transaction.objectStore('memos');
    store.put({ userId, memo });
    document.body.removeChild(modal);
    highlightUserPosts(userId);
  };

  // 취소 버튼 이벤트
  document.getElementById('cancelMemo').onclick = () => {
    document.body.removeChild(modal);
  };
}

// 메모가 있는 사용자의 게시물 강조 표시
function highlightUserPosts(userId) {
  console.log('게시물 하이라이트 시도:', userId);
  const posts = document.querySelectorAll('#boardlist > tbody > tr');
  const currentUrl = window.location.href;
  
  posts.forEach(post => {
    const userLink = post.querySelector('span.author');
    if (userLink && userLink.getAttribute('onclick')?.includes(userId)) {
      const transaction = db.transaction(['memos'], 'readonly');
      const store = transaction.objectStore('memos');
      const request = store.get(userId);

      request.onsuccess = (event) => {
        const result = event.target.result;
        if (result) {
          console.log('메모 찾음:', result.memo);
          let titleCell, number, sbj, nic;
          
          if (currentUrl.includes('view?code=best')) {
            // view?code=best: 첫번째셀 게시물번호, 세번째셀 타이틀, 네번째셀 사용자별명
            number = post.querySelector('td:nth-child(1)')?.textContent?.trim();
            titleCell = post.querySelector('td:nth-child(3)');
            nic = post.querySelector('td:nth-child(4) span.author')?.textContent?.trim();
          } else if (currentUrl.includes('view?code=strange')) {
            // view?code=strange: 첫번째셀 게시물번호, 두번째셀 타이틀, 세번째셀 사용자별명
            number = post.querySelector('td:nth-child(1)')?.textContent?.trim();
            titleCell = post.querySelector('td:nth-child(2)');
            nic = post.querySelector('td:nth-child(3) span.author')?.textContent?.trim();
          } else if (currentUrl.includes('list?code=best')) {
            // list?code=best: 두번째셀 타이틀, 세번째셀 사용자별명, 두번째셀 a태그의 href에서 No 추출
            titleCell = post.querySelector('td:nth-child(2)');
            nic = post.querySelector('td:nth-child(3) span.author')?.textContent?.trim();
            const titleLink = titleCell.querySelector('a');
            if (titleLink) {
              const href = titleLink.getAttribute('href');
              const match = href.match(/No=(\d+)/);
              if (match) {
                number = match[1];
              }
            }
          } else if (currentUrl.includes('list?code=strange')) {
            // list?code=strange: 첫번째셀 게시물번호, 두번째셀 타이틀, 세번째셀 사용자별명
            number = post.querySelector('td:nth-child(1)')?.textContent?.trim();
            titleCell = post.querySelector('td:nth-child(2)');
            nic = post.querySelector('td:nth-child(3) span.author')?.textContent?.trim();
          }else{
            number = post.querySelector('td:nth-child(1)')?.textContent?.trim();
            titleCell = post.querySelector('td:nth-child(2)');
            nic = post.querySelector('td:nth-child(3) span.author')?.textContent?.trim();            
          }
          
          if (titleCell) {
            // 취소선 클래스 추가
            titleCell.classList.add('has-memo-title');
            
            // 이미 추가된 메모 아이콘이 있는지 확인
            if (!titleCell.querySelector('.memo-indicator')) {
              const container = document.createElement('span');
              container.style.marginRight = '5px';

              const memoIndicator = document.createElement('span');
              memoIndicator.className = 'memo-indicator';
              memoIndicator.innerHTML = `📝 <span class="memo-tooltip">${result.memo}</span>`;
              
              const reportButton = document.createElement('span');
              reportButton.className = 'report-button';
              reportButton.innerHTML = '🚨';
              reportButton.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                // view 상태이고 number가 "현재글"일 때만 strong 태그의 텍스트를 사용
                if (currentUrl.includes('view') && number === '현재글') {
                  sbj = titleCell.querySelector('strong')?.textContent?.trim();
                } else {
                  sbj = titleCell.querySelector('a')?.getAttribute('title') || titleCell.querySelector('a')?.textContent?.trim();
                }
                
                if (number && sbj && nic) {
                  const url = `/board/bulletin/report_info.php?gubun=본문&code=strange&number=${number}&title=${encodeURIComponent(sbj)}&nic=${encodeURIComponent(nic)}`;
                  window.open(url, '', 'width=525,height=575');
                }
              };

              container.appendChild(memoIndicator);
              container.appendChild(reportButton);
              titleCell.insertBefore(container, titleCell.firstChild);
              console.log('메모 아이콘과 신고 버튼 추가됨');
            }
          }
        }
      };
    }
  });
}

// MutationObserver를 사용하여 동적으로 추가되는 컨텍스트 메뉴 감지
const observer = new MutationObserver((mutations) => {
  mutations.forEach((mutation) => {
    if (mutation.addedNodes.length) {
      mutation.addedNodes.forEach((node) => {
        if (node.id === 'submenusel') {
          console.log('submenusel 메뉴 감지됨');
          
          // 메뉴 리스트 확인
          const menuList = node.querySelector('ol');
          if (!menuList) return;

          // 회원차단 메뉴가 없으면 추가
          if (!menuList.querySelector('.submenu_item')) {
            // 클릭된 링크 찾기
            const clickedLink = document.querySelector('span.author[data-clicked="true"]');
            if (clickedLink) {
              const onclick = clickedLink.getAttribute('onclick');
              if (onclick) {
                const match = onclick.match(/submenu_show\('([^']+)','([^']+)'\)/);
                if (match) {
                  const userId = match[1];
                  
                  // 회원차단 메뉴 아이템 생성
                  const blockItem = document.createElement('li');
                        blockItem.setAttribute("style","width:130px;text-align:left;margin:5px 0px;padding-left:10px;color:4c4c4c;");
                  const blockLink = document.createElement('a');
                  blockLink.href = '#';
                  blockLink.className = 'submenu_item';
                  blockLink.textContent = '회원차단';
                  blockLink.onclick = function(e) {
                    e.preventDefault();
                    if (typeof user_block === 'function') {
                      user_block(userId);
                    }
                  };
                  blockItem.appendChild(blockLink);
                  menuList.appendChild(blockItem);
                }
              }
            }
          }
        }
      });
    }
  });
});

// 사용자 링크 클릭 이벤트 감지
function handleUserLinkClick(e) {
  console.log('클릭 이벤트 발생');
  
  // 클릭된 요소가 span.author인지 확인
  let target = e.target;
  while (target && !target.classList.contains('author')) {
    target = target.parentElement;
  }
  
  if (!target) return;
  
  // 이전에 클릭된 요소의 data-clicked 속성 제거
  const prevClicked = document.querySelector('span.author[data-clicked="true"]');
  if (prevClicked) {
    prevClicked.removeAttribute('data-clicked');
  }
  
  // 현재 클릭된 요소에 data-clicked 속성 추가
  target.setAttribute('data-clicked', 'true');
  
  console.log('클릭된 요소:', target);
  console.log('onclick 속성:', target.getAttribute('onclick'));
  
  // onclick 속성에서 사용자 정보 추출
  const onclick = target.getAttribute('onclick');
  if (onclick && onclick.includes('submenu_show')) {
    const match = onclick.match(/submenu_show\('([^']+)','([^']+)'\)/);
    if (match) {
      const userId = match[1];
      const userName = match[2];
      console.log('사용자 정보 추출:', userId, userName);
      setTimeout(() => addMemoButton(userId, userName), 100);
    }
  }
}

// 이벤트 리스너 등록
document.addEventListener('click', handleUserLinkClick);

// 페이지 로드 시 메모가 있는 게시물 강조 표시
document.addEventListener('DOMContentLoaded', () => {
  console.log('DOMContentLoaded 이벤트 발생');
  const transaction = db.transaction(['memos'], 'readonly');
  const store = transaction.objectStore('memos');
  const request = store.getAll();

  request.onsuccess = (event) => {
    event.target.result.forEach(memo => {
      highlightUserPosts(memo.userId);
    });
  };
});

// DOM 변경 감지 시작
observer.observe(document.body, {
  childList: true,
  subtree: true
});

// 페이지 로드 후 추가 이벤트 리스너 등록
window.addEventListener('load', () => {
  console.log('페이지 로드 완료');
  // 게시물 목록에 있는 모든 사용자 링크에 이벤트 리스너 추가
  const userLinks = document.querySelectorAll('span.author');
  console.log('찾은 사용자 링크 수:', userLinks.length);
  userLinks.forEach(link => {
    link.addEventListener('click', handleUserLinkClick);
  });
});

// 모든 메모를 체크하고 표시하는 함수
function checkAllMemos() {
  console.log('모든 메모 체크 시작');
  const transaction = db.transaction(['memos'], 'readonly');
  const store = transaction.objectStore('memos');
  const request = store.getAll();

  request.onsuccess = (event) => {
    const memos = event.target.result;
    console.log('찾은 메모:', memos);
    memos.forEach(memo => {
      highlightUserPosts(memo.userId);
    });
  };
}

// 페이지 변경을 감지하는 함수
function observePageChanges() {
  const boardlist = document.getElementById('boardlist');
  if (boardlist) {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList') {
          console.log('게시판 내용 변경 감지');
          checkAllMemos();
        }
      });
    });

    observer.observe(boardlist, {
      childList: true,
      subtree: true
    });
  }
}

// 페이지 로드 시 옵저버 설정
document.addEventListener('DOMContentLoaded', () => {
  console.log('DOMContentLoaded 이벤트 발생');
  observePageChanges();
}); 