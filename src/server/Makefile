CXX      = g++
CXXFLAGS = -O2 -static -Wall -Wextra -Wpedantic -Wno-gnu
LDFLAGS  = -static

.PHONY: all clean

all: tiny-server

tiny-server: main.o http.o response.o mime.o
	$(CXX) $(LDFLAGS) -o $@ $^

main.o: main.c server.h
	$(CXX) $(CXXFLAGS) -c -o $@ $<

http.o: http.c server.h
	$(CXX) $(CXXFLAGS) -c -o $@ $<

response.o: response.c server.h
	$(CXX) $(CXXFLAGS) -c -o $@ $<

mime.o: mime.c server.h
	$(CXX) $(CXXFLAGS) -c -o $@ $<

clean:
	rm -f *.o tiny-server
