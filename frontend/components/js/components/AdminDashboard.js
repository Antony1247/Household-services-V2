export default {
    template: `
        <div>
            <nav class="navbar navbar-dark bg-dark">
                <div class="container-fluid">
                    <a class="navbar-brand" href="/#/admin-dashboard">Admin Dashboard</a>
                    <div>
                        <router-link to="/servicesList" class="nav-link d-inline text-white">Manage Services</router-link>
                        <router-link to="/professionalsList" class="nav-link d-inline text-white">Manage Professionals</router-link>
                        <router-link to="/customers" class="nav-link d-inline text-white">Manage Customers</router-link>
                        <router-link to="/service-requests" class="nav-link d-inline text-white">service requests</router-link>
                        <router-link to="/export-service-requests" class="nav-link d-inline text-white">Export CSV</router-link>
                        <router-link to="/admin-search" class="nav-link d-inline text-white">Search</router-link>
                        <button @click="logout" class="btn btn-danger ms-3">Logout</button>
                    </div>
                </div>
            </nav>

            <div class="container mt-5">
                <h1 class="text-center">Summary</h1>
                <div class="overall-rating text-center text-success">
                    Overall Rating: {{ overallRating }}/5
                </div>

                <div class="row mt-4">
                    <div class="col-md-6">
                        <div class="card shadow p-3">
                            <h4 class="text-center">Customer Ratings Summary</h4>
                            <canvas id="ratingChart"></canvas>
                        </div>
                    </div>
                    <div class="col-md-6">
                        <div class="card shadow p-3">
                            <h4 class="text-center">Service Requests Status</h4>
                            <canvas id="statusChart"></canvas>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `,
    data() {
        return {
            overallRating: 0,
            ratingCounts: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
            statusCounts: { Completed: 0, Rejected: 0, Pending: 0 }
        };
    },
    methods: {
        async fetchDashboardData() {
            try {
                const response = await axios.get('/api/admin_dashboard', {
                    headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
                });

                this.overallRating = response.data.overall_rating;
                this.ratingCounts = response.data.rating_counts;
                this.statusCounts = response.data.status_counts;

                this.renderCharts();
            } catch (error) {
                console.error("Error fetching dashboard data:", error);
            }
        },
        renderCharts() {
            const ctx1 = document.getElementById("ratingChart").getContext("2d");
            new Chart(ctx1, {
                type: "pie",
                data: {
                    labels: ["1 Star", "2 Stars", "3 Stars", "4 Stars", "5 Stars"],
                    datasets: [{
                        label: "Customer Ratings",
                        data: Object.values(this.ratingCounts),
                        backgroundColor: ["#ef4444", "#f97316", "#facc15", "#10b981", "#3b82f6"]
                    }]
                }
            });

            const ctx2 = document.getElementById("statusChart").getContext("2d");
            new Chart(ctx2, {
                type: "bar",
                data: {
                    labels: ["Completed", "Rejected", "Pending"],
                    datasets: [{
                        label: "Service Requests",
                        data: [this.statusCounts.Completed, this.statusCounts.Rejected, this.statusCounts.Pending],
                        backgroundColor: ["#3b82f6", "#ef4444", "#facc15"]
                    }]
                },
                options: {
                    responsive: true,
                    scales: {
                        y: {
                            beginAtZero: true
                        }
                    }
                }
            });
        },
        logout() {
            axios.post('/api/logout', {}, { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } })
                .then(() => {
                    localStorage.clear();
                    window.location.href = "/#/login";
                })
                .catch(error => console.error(error));
        }
    },
    mounted() {
        this.fetchDashboardData();
    }
};
